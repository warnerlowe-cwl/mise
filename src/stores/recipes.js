import { defineStore } from 'pinia'
import { getDb } from '../db/database'

export const useRecipesStore = defineStore('recipes', {
  state: () => ({
    recipes: [],
    loading: false,
    error: null,
  }),

  getters: {
    totalRecipes: (state) => state.recipes.length,
  },

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const db = await getDb()
        // Base cost from ingredient lines. Yield-adjusted: an 80%-yield item effectively
        // costs 1/0.8 more per usable unit. NULL/0 yield = 100% (no loss).
        const rows = await db.select(`
          SELECT r.*,
            COALESCE(SUM(ri.quantity * i.cost_per_unit / (COALESCE(NULLIF(i.yield_pct,0),100)/100.0)), 0) AS base_cost
          FROM recipes r
          LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
          LEFT JOIN ingredients i ON ri.ingredient_id = i.id
          GROUP BY r.id
          ORDER BY r.name ASC
        `)
        const components = await db.select('SELECT parent_recipe_id, child_recipe_id, servings_used FROM recipe_components')

        // Roll sub-recipe costs into each recipe's total. A child contributes
        // (child total cost / child servings) × servings_used. Memoized + cycle-guarded.
        const byId = {}
        for (const r of rows) byId[r.id] = r
        const compsByParent = {}
        for (const c of components) (compsByParent[c.parent_recipe_id] ||= []).push(c)

        const memo = {}
        const fullCost = (rid, stack = new Set()) => {
          if (memo[rid] != null) return memo[rid]
          const r = byId[rid]
          if (!r || stack.has(rid)) return r ? Number(r.base_cost) || 0 : 0
          stack.add(rid)
          let total = Number(r.base_cost) || 0
          for (const c of compsByParent[rid] || []) {
            const child = byId[c.child_recipe_id]
            if (!child) continue
            const perServing = fullCost(c.child_recipe_id, stack) / (Number(child.servings) || 1)
            total += perServing * (Number(c.servings_used) || 0)
          }
          stack.delete(rid)
          memo[rid] = total
          return total
        }
        for (const r of rows) r.total_cost = fullCost(r.id)
        this.recipes = rows
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    // Fully expand a recipe to raw ingredient lines, recursively exploding sub-recipes
    // (scaled by servings used ÷ child servings) and aggregating by ingredient + unit.
    // Cycle-guarded. Used by Scaling, Prep Planner and Spec Sheets so their costs +
    // shopping lists include components. Requires this.recipes to be loaded (for servings).
    async getExpandedIngredients(recipeId) {
      const expand = async (rid, mult, stack) => {
        if (stack.has(rid)) return []
        stack.add(rid)
        const direct = await this.getIngredients(rid)
        const out = direct.map((l) => ({ ...l, quantity: Number(l.quantity) * mult }))
        const comps = await this.getComponents(rid)
        for (const c of comps) {
          const child = this.recipes.find((r) => r.id === c.child_recipe_id)
          const childServings = Number(child?.servings) || 1
          const childMult = mult * ((Number(c.servings_used) || 0) / childServings)
          if (childMult > 0) out.push(...await expand(c.child_recipe_id, childMult, stack))
        }
        stack.delete(rid)
        return out
      }
      const flat = await expand(recipeId, 1, new Set())
      const agg = {}
      for (const l of flat) {
        const key = l.ingredient_id + '|' + (l.unit || '')
        if (!agg[key]) agg[key] = { ...l, quantity: 0 }
        agg[key].quantity += Number(l.quantity) || 0
      }
      return Object.values(agg)
    },

    // Sell sizes for a recipe (Small/Large etc.).
    async getSizes(recipeId) {
      const db = await getDb()
      return await db.select('SELECT * FROM recipe_sizes WHERE recipe_id=? ORDER BY portion_mult ASC, id ASC', [recipeId])
    },

    async _saveSizes(db, recipeId, sizes) {
      await db.execute('DELETE FROM recipe_sizes WHERE recipe_id=?', [recipeId])
      for (const s of sizes || []) {
        const label = (s.label || '').trim()
        if (!label || !(Number(s.portion_mult) > 0)) continue
        await db.execute(
          'INSERT INTO recipe_sizes (recipe_id, label, portion_mult, menu_price) VALUES (?, ?, ?, ?)',
          [recipeId, label, Number(s.portion_mult), s.menu_price === '' || s.menu_price == null ? null : Number(s.menu_price)]
        )
      }
    },

    // Sub-recipe components of a recipe (with child name + servings for display).
    async getComponents(recipeId) {
      const db = await getDb()
      return await db.select(`
        SELECT rc.*, cr.name AS child_name, cr.servings AS child_servings
        FROM recipe_components rc
        JOIN recipes cr ON rc.child_recipe_id = cr.id
        WHERE rc.parent_recipe_id = ?
      `, [recipeId])
    },

    async getIngredients(recipeId) {
      const db = await getDb()
      return await db.select(`
        SELECT ri.*, i.name AS ingredient_name, i.cost_per_unit, i.allergens,
          (i.cost_per_unit / (COALESCE(NULLIF(i.yield_pct,0),100)/100.0)) AS effective_cost
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `, [recipeId])
    },

    async add(recipe, lines, components = [], sizes = []) {
      const db = await getDb()
      await db.execute(
        'INSERT INTO recipes (name, category, servings, notes) VALUES (?, ?, ?, ?)',
        [recipe.name, recipe.category || null, recipe.servings, recipe.notes || null]
      )
      const rows = await db.select('SELECT last_insert_rowid() AS id')
      const recipeId = rows[0].id
      for (const line of lines) {
        await db.execute(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
          [recipeId, line.ingredient_id, line.quantity, line.unit]
        )
      }
      await this._saveComponents(db, recipeId, components)
      await this._saveSizes(db, recipeId, sizes)
      await this.fetchAll()
    },

    async update(id, recipe, lines, components = [], sizes = []) {
      const db = await getDb()
      await db.execute(
        'UPDATE recipes SET name=?, category=?, servings=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [recipe.name, recipe.category || null, recipe.servings, recipe.notes || null, id]
      )
      await db.execute('DELETE FROM recipe_ingredients WHERE recipe_id=?', [id])
      for (const line of lines) {
        await db.execute(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
          [id, line.ingredient_id, line.quantity, line.unit]
        )
      }
      await this._saveComponents(db, id, components)
      await this._saveSizes(db, id, sizes)
      await this.fetchAll()
    },

    // Replace a recipe's sub-recipe components. Skips self-references.
    async _saveComponents(db, recipeId, components) {
      await db.execute('DELETE FROM recipe_components WHERE parent_recipe_id=?', [recipeId])
      for (const c of components || []) {
        if (!c.child_recipe_id || Number(c.child_recipe_id) === Number(recipeId)) continue
        if (!(Number(c.servings_used) > 0)) continue
        await db.execute(
          'INSERT INTO recipe_components (parent_recipe_id, child_recipe_id, servings_used) VALUES (?, ?, ?)',
          [recipeId, c.child_recipe_id, c.servings_used]
        )
      }
    },

    // Menu pricing: persist a target food-cost % and/or a set menu price for a recipe.
    async setPricing(id, { target_food_cost_pct, menu_price }) {
      const db = await getDb()
      await db.execute(
        'UPDATE recipes SET target_food_cost_pct=?, menu_price=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [target_food_cost_pct ?? null, menu_price ?? null, id]
      )
      await this.fetchAll()
    },

    // Clone a recipe and all its ingredient lines (chefs riff on a base recipe).
    async duplicate(id) {
      const db = await getDb()
      const orig = this.recipes.find((r) => r.id === id)
      if (!orig) return
      const lines = await this.getIngredients(id)
      await db.execute(
        `INSERT INTO recipes (name, category, servings, notes, menu_price, target_food_cost_pct, units_sold, prep_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${orig.name} (copy)`, orig.category ?? null, orig.servings ?? 1, orig.notes ?? null,
          orig.menu_price ?? null, orig.target_food_cost_pct ?? null, orig.units_sold ?? null, orig.prep_minutes ?? null,
        ]
      )
      const [row] = await db.select('SELECT last_insert_rowid() AS id')
      for (const l of lines) {
        await db.execute(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
          [row.id, l.ingredient_id, l.quantity, l.unit]
        )
      }
      const comps = await this.getComponents(id)
      await this._saveComponents(db, row.id, comps)
      const sizes = await this.getSizes(id)
      await this._saveSizes(db, row.id, sizes)
      await this.fetchAll()
      return row.id
    },

    // Plate cost: record labor minutes per batch for a recipe.
    async setPrep(id, prep_minutes) {
      const db = await getDb()
      await db.execute(
        'UPDATE recipes SET prep_minutes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [prep_minutes ?? null, id]
      )
      await this.fetchAll()
    },

    // Menu engineering: record units sold in the period for a recipe.
    async setSales(id, units_sold) {
      const db = await getDb()
      await db.execute(
        'UPDATE recipes SET units_sold=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [units_sold ?? null, id]
      )
      await this.fetchAll()
    },

    async remove(id) {
      const db = await getDb()
      await db.execute('DELETE FROM recipes WHERE id=?', [id])
      await this.fetchAll()
    },
  },
})
