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
        this.recipes = await db.select(`
          SELECT r.*,
            COALESCE(SUM(ri.quantity * i.cost_per_unit), 0) AS total_cost
          FROM recipes r
          LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
          LEFT JOIN ingredients i ON ri.ingredient_id = i.id
          GROUP BY r.id
          ORDER BY r.name ASC
        `)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async getIngredients(recipeId) {
      const db = await getDb()
      return await db.select(`
        SELECT ri.*, i.name AS ingredient_name, i.cost_per_unit, i.allergens
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
      `, [recipeId])
    },

    async add(recipe, lines) {
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
      await this.fetchAll()
    },

    async update(id, recipe, lines) {
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
      await this.fetchAll()
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

    async remove(id) {
      const db = await getDb()
      await db.execute('DELETE FROM recipes WHERE id=?', [id])
      await this.fetchAll()
    },
  },
})
