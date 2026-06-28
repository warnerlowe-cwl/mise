import { defineStore } from 'pinia'
import { getDb } from '../db/database'

export const useIngredientsStore = defineStore('ingredients', {
  state: () => ({
    ingredients: [],
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

    async add(ingredient) {
      const db = await getDb()
      await db.execute(
        'INSERT INTO ingredients (name, unit, cost_per_unit, supplier, notes) VALUES (?, ?, ?, ?, ?)',
        [ingredient.name, ingredient.unit, ingredient.cost_per_unit, ingredient.supplier || null, ingredient.notes || null]
      )
      await this.fetchAll()
    },

    // Bulk insert (CSV import). Inserts all rows, then refreshes once.
    async addMany(rows) {
      const db = await getDb()
      for (const r of rows) {
        await db.execute(
          'INSERT INTO ingredients (name, unit, cost_per_unit, supplier, notes) VALUES (?, ?, ?, ?, ?)',
          [r.name, r.unit, r.cost_per_unit, r.supplier || null, r.notes || null]
        )
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
      await db.execute(
        'UPDATE ingredients SET name=?, unit=?, cost_per_unit=?, supplier=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [ingredient.name, ingredient.unit, ingredient.cost_per_unit, ingredient.supplier || null, ingredient.notes || null, id]
      )
      await this.fetchAll()
    },

    async remove(id) {
      const db = await getDb()
      await db.execute('DELETE FROM ingredients WHERE id=?', [id])
      await this.fetchAll()
    },
  },
})
