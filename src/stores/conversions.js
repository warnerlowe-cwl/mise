import { defineStore } from 'pinia'
import { getDb } from '../db/database'

export const useConversionsStore = defineStore('conversions', {
  state: () => ({
    conversions: [],
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const db = await getDb()
        this.conversions = await db.select('SELECT * FROM conversions ORDER BY from_unit, to_unit')
      } catch (e) {
        // silent — seed data should always be present
      } finally {
        this.loading = false
      }
    },

    convert(fromUnit, toUnit, quantity) {
      if (fromUnit === toUnit) return quantity
      const direct = this.conversions.find(c => c.from_unit === fromUnit && c.to_unit === toUnit)
      if (direct) return quantity * direct.factor
      // two-step through any shared intermediate
      const viaFrom = this.conversions.filter(c => c.from_unit === fromUnit)
      for (const step1 of viaFrom) {
        const step2 = this.conversions.find(c => c.from_unit === step1.to_unit && c.to_unit === toUnit)
        if (step2) return quantity * step1.factor * step2.factor
      }
      return null
    },
  },
})
