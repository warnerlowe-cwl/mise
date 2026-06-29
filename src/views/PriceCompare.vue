<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Compare Prices</h1>
        <p class="page-subtitle">Record what each supplier charges and let Mise find the cheapest</p>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:14px 16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap">
      <input v-model="search" class="form-input" placeholder="Search ingredients…" style="flex:1; min-width:200px" />
      <div style="color:var(--text-dim); font-size:13px; white-space:nowrap">
        <strong :style="{ color: savingsCount ? '#6ee7b7' : 'var(--text)' }">{{ savingsCount }}</strong>
        ingredient{{ savingsCount === 1 ? '' : 's' }} with a cheaper option
      </div>
    </div>

    <datalist id="compare-suppliers">
      <option v-for="s in supplierSuggestions" :key="s" :value="s" />
    </datalist>

    <div v-if="rows.length" style="margin-top:12px; display:flex; flex-direction:column; gap:12px">
      <div v-for="r in rows" :key="r.id" class="card cmp-card">
        <div class="cmp-head">
          <div>
            <span class="cmp-name">{{ r.name }}</span>
            <span class="cmp-unit">per {{ r.unit }}</span>
          </div>
          <span v-if="r.savings > 0" class="cmp-save">
            Save {{ cur }}{{ r.savings.toFixed(2) }}/{{ r.unit }} ({{ r.savingsPct.toFixed(0) }}%) with {{ r.cheapest.supplier }}
          </span>
          <span v-else class="cmp-best">✓ on the best price</span>
        </div>

        <div class="cmp-quotes">
          <div v-for="(o, i) in r.options" :key="o.key" class="cmp-quote"
            :class="{ 'cmp-quote-best': o.isCheapest, 'cmp-quote-active': o.active }">
            <div class="cmp-q-left">
              <span class="cmp-q-supplier">{{ o.supplier }}</span>
              <span v-if="o.active" class="cmp-tag cmp-tag-active">active</span>
              <span v-if="o.isCheapest" class="cmp-tag cmp-tag-best">cheapest</span>
            </div>
            <div class="cmp-q-right">
              <span class="cmp-q-price">{{ cur }}{{ o.price.toFixed(2) }}</span>
              <button v-if="!o.active" class="btn btn-ghost cmp-btn" @click="makeActive(r, o)">Use this</button>
              <button v-if="o.isQuote" class="btn btn-ghost cmp-btn" title="Remove quote" @click="store.removeQuote(o.id)">✕</button>
            </div>
          </div>
        </div>

        <div class="cmp-add">
          <input v-model="draft[r.id].supplier" list="compare-suppliers" class="form-input" placeholder="Supplier" style="flex:2; min-width:140px" />
          <input v-model.number="draft[r.id].price" type="number" step="0.01" min="0" class="form-input" :placeholder="'$ / ' + r.unit" style="flex:1; min-width:90px" />
          <button class="btn btn-primary cmp-btn" :disabled="!canAdd(r.id)" @click="addQuote(r)">+ Add quote</button>
        </div>
      </div>
    </div>

    <div v-else class="card" style="margin-top:12px; padding:40px; text-align:center; color:var(--text-dim)">
      {{ search ? 'No matches.' : 'Add ingredients first, then record each supplier\'s price here to compare.' }}
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 Add a price quote for each supplier of an ingredient (straight off their invoice). Mise flags the
        <strong style="color:var(--text)">cheapest</strong> and shows what you'd save. Hit
        <strong style="color:var(--text)">Use this</strong> to make a supplier the active price — that flows into your
        recipe costs and Price Trends. Pack sizing keeps it fair: enter each in the same unit and they compare apples-to-apples.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'
import { getRegion, suppliersForRegion } from '../data/suppliers'

const store = useIngredientsStore()
const search = ref('')
const draft = reactive({})

onMounted(async () => {
  await store.fetchAll()
  await store.loadQuotes()
})

// Ensure every ingredient has a draft row for the add-quote inputs.
watch(() => store.ingredients.map((i) => i.id).join(','), () => {
  for (const i of store.ingredients) if (!draft[i.id]) draft[i.id] = { supplier: '', price: null }
}, { immediate: true })

const supplierSuggestions = computed(() => {
  const used = store.ingredients.map((i) => i.supplier).filter(Boolean)
  return [...new Set([...used, ...suppliersForRegion(getRegion())])]
})

const enriched = computed(() =>
  store.ingredients.map((ing) => {
    const activePrice = Number(ing.cost_per_unit) || 0
    const options = [
      { key: 'active', supplier: ing.supplier || 'Current price', price: activePrice, active: true, isQuote: false },
      ...(store.quotes[ing.id] || []).map((q) => ({ key: 'q' + q.id, id: q.id, supplier: q.supplier, price: Number(q.price), active: false, isQuote: true })),
    ].sort((a, b) => a.price - b.price)
    const cheapest = options[0]
    options.forEach((o) => { o.isCheapest = o.price === cheapest.price })
    const savings = activePrice > cheapest.price ? activePrice - cheapest.price : 0
    const savingsPct = activePrice ? (savings / activePrice) * 100 : 0
    return { id: ing.id, name: ing.name, unit: ing.unit, options, cheapest, savings, savingsPct, hasAlt: options.length > 1 }
  })
)

const savingsCount = computed(() => enriched.value.filter((r) => r.savings > 0).length)

const rows = computed(() => {
  let list = enriched.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((r) => r.name.toLowerCase().includes(q))
  }
  // Ingredients with a saving first, then those with extra quotes, then the rest.
  return [...list].sort((a, b) => (b.savings > 0) - (a.savings > 0) || b.options.length - a.options.length || a.name.localeCompare(b.name))
})

function canAdd(id) {
  const d = draft[id]
  return d && d.supplier && d.supplier.trim() && Number(d.price) > 0
}
async function addQuote(r) {
  if (!canAdd(r.id)) return
  const d = draft[r.id]
  await store.addQuote(r.id, d.supplier.trim(), Number(d.price))
  draft[r.id] = { supplier: '', price: null }
}
async function makeActive(r, o) {
  await store.setActiveQuote(r.id, o.supplier === 'Current price' ? (r.options.find((x) => x.active)?.supplier || '') : o.supplier, o.price)
}
</script>

<style scoped>
.cmp-card { padding: 16px; }
.cmp-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.cmp-name { font-weight: 700; font-size: 16px; }
.cmp-unit { color: var(--text-dim); font-size: 13px; margin-left: 8px; }
.cmp-save { color: #6ee7b7; font-weight: 600; font-size: 13px; }
.cmp-best { color: var(--text-dim); font-size: 13px; }
.cmp-quotes { display: flex; flex-direction: column; gap: 6px; }
.cmp-quote { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); }
.cmp-quote-best { border-color: rgba(110,231,183,0.4); background: rgba(110,231,183,0.07); }
.cmp-q-left { display: flex; align-items: center; gap: 8px; }
.cmp-q-supplier { font-weight: 600; font-size: 13.5px; }
.cmp-tag { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 4px; }
.cmp-tag-active { background: rgba(245,158,11,0.16); color: var(--accent); }
.cmp-tag-best { background: rgba(110,231,183,0.16); color: #6ee7b7; }
.cmp-q-right { display: flex; align-items: center; gap: 8px; }
.cmp-q-price { font-weight: 700; font-size: 14px; }
.cmp-btn { padding: 4px 10px; font-size: 12px; }
.cmp-add { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
</style>
