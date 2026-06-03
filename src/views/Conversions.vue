<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Conversions</h1>
        <p class="page-subtitle">Convert between units for accurate recipe scaling</p>
      </div>
    </div>

    <div class="conv-grid">
      <!-- Calculator -->
      <div class="card">
        <div class="section-header">Unit Calculator</div>

        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input v-model="qty" class="form-input" type="number" step="any" min="0" placeholder="Enter amount" />
        </div>

        <div class="unit-row">
          <div class="form-group" style="margin: 0">
            <label class="form-label">From</label>
            <select v-model="fromUnit" class="form-select">
              <option v-for="u in allUnits" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <div class="swap-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8h12M13 5l3 3-3 3"/>
              <path d="M16 12H4M7 9l-3 3 3 3"/>
            </svg>
          </div>
          <div class="form-group" style="margin: 0">
            <label class="form-label">To</label>
            <select v-model="toUnit" class="form-select">
              <option v-for="u in allUnits" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
        </div>

        <div class="result-box">
          <div v-if="result !== null">
            <div class="result-label">Result</div>
            <div class="result-value">{{ result }}</div>
            <div class="result-unit">{{ toUnit }}</div>
            <div class="result-equation">{{ qty }} {{ fromUnit }} = {{ result }} {{ toUnit }}</div>
          </div>
          <div v-else class="result-empty">Enter a quantity and select units</div>
        </div>
      </div>

      <!-- Conversion Reference Table -->
      <div class="card ref-card">
        <div class="ref-card-header">
          <div class="section-header" style="margin: 0">Conversion Reference</div>
        </div>
        <div class="ref-card-body">
          <div v-for="group in conversionGroups" :key="group.label" class="ref-group">
            <div class="section-header">{{ group.label }}</div>
            <div class="ref-rows">
              <div v-for="c in group.rows" :key="c.from_unit + c.to_unit" class="ref-row">
                <span class="ref-from">1 {{ c.from_unit }}</span>
                <span class="ref-eq">=</span>
                <span class="ref-to">{{ c.factor }} {{ c.to_unit }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConversionsStore } from '../stores/conversions'

const store = useConversionsStore()

const qty = ref('')
const fromUnit = ref('lb')
const toUnit = ref('oz')

onMounted(() => store.fetchAll())

const allUnits = ['lb', 'oz', 'kg', 'g', 'gal', 'qt', 'pt', 'cup', 'fl oz', 'tbsp', 'tsp', 'each', 'dozen', 'case', 'bag', 'can', 'bottle']

const result = computed(() => {
  if (!qty.value || isNaN(Number(qty.value))) return null
  const r = store.convert(fromUnit.value, toUnit.value, Number(qty.value))
  if (r === null) return null
  return parseFloat(r.toFixed(6)).toString()
})

const conversionGroups = computed(() => {
  const weight = store.conversions.filter(c =>
    ['lb', 'oz', 'kg', 'g'].includes(c.from_unit) && ['lb', 'oz', 'kg', 'g'].includes(c.to_unit)
  )
  const volume = store.conversions.filter(c =>
    ['gal', 'qt', 'pt', 'cup', 'fl oz', 'tbsp', 'tsp'].includes(c.from_unit) &&
    ['gal', 'qt', 'pt', 'cup', 'fl oz', 'tbsp', 'tsp'].includes(c.to_unit)
  )
  return [
    { label: 'Weight', rows: weight },
    { label: 'Volume', rows: volume },
  ].filter(g => g.rows.length)
})
</script>

<style scoped>
.conv-grid { display: grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: start; }
.unit-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: end; margin-bottom: 20px; }
.swap-icon { color: var(--text-muted); padding-bottom: 9px; display: flex; align-items: flex-end; justify-content: center; }

.ref-card { padding: 0; overflow: hidden; }
.ref-card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); }
.ref-card-body { padding: 16px 20px; }
.ref-group { margin-bottom: 20px; }
.ref-group:last-child { margin-bottom: 0; }
.ref-rows { display: flex; flex-direction: column; gap: 6px; }
.ref-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--surface-2); border-radius: 6px; }
.ref-from { color: var(--text-dim); font-size: 13px; }
.ref-eq { color: var(--text-muted); font-size: 12px; }
.ref-to { color: var(--text); font-weight: 600; font-size: 13px; }

.result-box { background: var(--surface-2); border-radius: 8px; padding: 20px; text-align: center; }
.result-label { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
.result-value { font-size: 28px; font-weight: 700; color: var(--accent); }
.result-unit { font-size: 13px; color: var(--text-dim); margin-top: 4px; }
.result-equation { font-size: 12px; color: var(--text-muted); margin-top: 12px; }
.result-empty { color: var(--text-muted); font-size: 13px; }
</style>
