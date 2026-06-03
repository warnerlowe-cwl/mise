import { defineStore } from 'pinia'
import { getDb } from '../db/database'

export const useWasteStore = defineStore('waste', {
  state: () => ({
    entries: [],
    loading: false,
    error: null,
  }),

  getters: {
    totalWasteCost: (state) => state.entries.reduce((sum, e) => sum + (e.waste_cost || 0), 0),
    weeklyWasteCost(state) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      return state.entries
        .filter(e => new Date(e.logged_at) >= cutoff)
        .reduce((sum, e) => sum + (e.waste_cost || 0), 0)
    },
  },

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const db = await getDb()
        this.entries = await db.select(`
          SELECT wl.*, i.name AS ingredient_name, i.cost_per_unit,
            (wl.quantity * i.cost_per_unit) AS waste_cost
          FROM waste_log wl
          JOIN ingredients i ON wl.ingredient_id = i.id
          ORDER BY wl.logged_at DESC
        `)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async add(entry) {
      const db = await getDb()
      await db.execute(
        'INSERT INTO waste_log (ingredient_id, quantity, unit, reason) VALUES (?, ?, ?, ?)',
        [entry.ingredient_id, entry.quantity, entry.unit, entry.reason || null]
      )
      await this.fetchAll()
    },

    async remove(id) {
      const db = await getDb()
      await db.execute('DELETE FROM waste_log WHERE id=?', [id])
      await this.fetchAll()
    },
  },
})
