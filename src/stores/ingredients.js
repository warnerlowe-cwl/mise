import { defineStore } from 'pinia'
import { getDb } from '../db/database'

export const useIngredientsStore = defineStore('ingredients', {
  state: () => ({
    ingredients: [],
    priceHistory: {},   // ingredient_id -> [{ cost_per_unit, recorded_at }, ...] oldest→newest
    loading: false,
    error: null,
  }),

  getters: {
    totalIngredients: (state) => state.ingredients.length,
  },

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const db = await getDb()
        this.ingredients = await db.select('SELECT * FROM ingredients ORDER BY name ASC')
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    // Load the full price history, grouped by ingredient (oldest first).
    async loadPriceHistory() {
      const db = await getDb()
      const rows = await db.select(
        'SELECT ingredient_id, cost_per_unit, recorded_at FROM price_history ORDER BY recorded_at ASC, id ASC'
      )
      const map = {}
      for (const r of rows) (map[r.ingredient_id] ||= []).push(r)
      this.priceHistory = map
    },

    // Record a price point for an ingredient (used on create + whenever cost changes).
    async _logPrice(db, ingredientId, cost) {
      await db.execute(
        'INSERT INTO price_history (ingredient_id, cost_per_unit) VALUES (?, ?)',
        [ingredientId, cost]
      )
    },

    async add(ingredient) {
      const db = await getDb()
      await db.execute(
        'INSERT INTO ingredients (name, unit, cost_per_unit, supplier, notes) VALUES (?, ?, ?, ?, ?)',
        [ingredient.name, ingredient.unit, ingredient.cost_per_unit, ingredient.supplier || null, ingredient.notes || null]
      )
      const [row] = await db.select('SELECT last_insert_rowid() AS id')
      if (row?.id != null) await this._logPrice(db, row.id, ingredient.cost_per_unit)
      await this.fetchAll()
    },

    // Bulk insert (CSV import). Inserts all rows + a baseline price point each, refreshes once.
    async addMany(rows) {
      const db = await getDb()
      for (const r of rows) {
        await db.execute(
          'INSERT INTO ingredients (name, unit, cost_per_unit, supplier, notes) VALUES (?, ?, ?, ?, ?)',
          [r.name, r.unit, r.cost_per_unit, r.supplier || null, r.notes || null]
        )
        const [row] = await db.select('SELECT last_insert_rowid() AS id')
        if (row?.id != null) await this._logPrice(db, row.id, r.cost_per_unit)
      }
      await this.fetchAll()
      return rows.length
    },

    // Inventory: set current on-hand quantity and/or par level for an ingredient.
    async setStock(id, { on_hand, par_level }) {
      const db = await getDb()
      await db.execute(
        'UPDATE ingredients SET on_hand=?, par_level=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [on_hand ?? null, par_level ?? null, id]
      )
      await this.fetchAll()
    },

    async update(id, ingredient) {
      const db = await getDb()
      const prev = this.ingredients.find((i) => i.id === id)
      await db.execute(
        'UPDATE ingredients SET name=?, unit=?, cost_per_unit=?, supplier=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [ingredient.name, ingredient.unit, ingredient.cost_per_unit, ingredient.supplier || null, ingredient.notes || null, id]
      )
      // Only record a new price point when the cost actually changed.
      if (!prev || Number(prev.cost_per_unit) !== Number(ingredient.cost_per_unit)) {
        await this._logPrice(db, id, ingredient.cost_per_unit)
      }
      await this.fetchAll()
    },

    async remove(id) {
      const db = await getDb()
      await db.execute('DELETE FROM ingredients WHERE id=?', [id])
      await this.fetchAll()
    },
  },
})
