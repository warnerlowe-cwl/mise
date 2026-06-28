<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventory</h1>
        <p class="page-subtitle">Track stock and get a reorder list when items run low</p>
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn btn-ghost" @click="printCount" :disabled="!enriched.length">🖨 Print count sheet</button>
        <button class="btn btn-ghost" @click="copyReorder" :disabled="!reorderList.length">📋 Copy reorder list</button>
      </div>
    </div>

    <div class="inv-summary">
      <div class="card inv-stat">
        <div class="inv-stat-val">${{ totalValue.toFixed(2) }}</div>
        <div class="inv-stat-label">Total stock value</div>
      </div>
      <div class="card inv-stat">
        <div class="inv-stat-val" :style="{ color: reorderList.length ? '#fbbf24' : '#6ee7b7' }">{{ reorderList.length }}</div>
        <div class="inv-stat-label">Items to reorder</div>
      </div>
      <div class="card inv-stat">
        <div class="inv-stat-val">{{ trackedCount }}</div>
        <div class="inv-stat-label">Ingredients tracked</div>
      </div>
    </div>

    <div style="margin-top:16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap">
      <input v-model="search" class="form-input" placeholder="Search ingredients…" style="flex:1; min-width:180px" />
      <label style="display:flex; align-items:center; gap:6px; color:var(--text-dim); white-space:nowrap; cursor:pointer">
        <input type="checkbox" v-model="onlyLow" /> Only show items to reorder
      </label>
    </div>

    <div class="card" style="margin-top:12px; padding:0; overflow:hidden">
      <table class="table" v-if="rows.length">
        <thead>
          <tr><th>Ingredient</th><th>On hand</th><th>Par level</th><th>Status</th><th>Stock value</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>
              <div style="font-weight:600">{{ r.name }}</div>
              <div style="color:var(--text-dim); font-size:12px">
                {{ r.supplier || 'No supplier' }} · ${{ Number(r.cost_per_unit).toFixed(2) }}/{{ r.unit }}
              </div>
            </td>
            <td>
              <input :value="r.on_hand ?? ''" @change="setOnHand(r, $event.target.value)"
                class="form-input" type="number" step="any" min="0" placeholder="0" style="width:78px" />
              <span style="color:var(--text-dim); font-size:12px; margin-left:4px">{{ r.unit }}</span>
            </td>
            <td>
              <input :value="r.par_level ?? ''" @change="setPar(r, $event.target.value)"
                class="form-input" type="number" step="any" min="0" placeholder="—" style="width:78px" />
            </td>
            <td>
              <span class="badge" :style="statusStyle(r.kind)">{{ r.statusLabel }}</span>
              <span v-if="r.reorderQty > 0" style="color:var(--text-dim); font-size:12px; margin-left:6px">
                order {{ r.reorderQty }} {{ r.unit }}
              </span>
            </td>
            <td>${{ r.stockValue.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <div class="empty-state-title">{{ onlyLow ? 'Nothing to reorder 🎉' : 'No ingredients yet' }}</div>
        <div class="empty-state-text">
          {{ onlyLow ? 'Everything is at or above par.' : 'Add ingredients first, then track stock here.' }}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 <strong style="color:var(--text)">Par level</strong> = the minimum amount to keep on hand. When
        <strong style="color:var(--text)">On hand</strong> drops below it, the item turns
        <span style="color:#fbbf24">Low</span> (or <span style="color:#fca5a5">Out</span>) and joins your reorder
        list — with exactly how much to order to get back to par. Hit
        <strong style="color:var(--text)">Copy reorder list</strong> to paste it into an email or text to your supplier.
      </p>
    </div>

    <!-- Printable stock count sheet (hidden on screen, shows only when printing) -->
    <div class="printable print-only count-sheet">
      <div class="cs-head">
        <h2>Stock Count Sheet</h2>
        <div class="cs-date">Date: __________  Counted by: __________</div>
      </div>
      <table class="cs-table">
        <thead><tr><th>Ingredient</th><th>Supplier</th><th>Unit</th><th>Par</th><th>Count</th></tr></thead>
        <tbody>
          <tr v-for="r in countSheet" :key="r.id">
            <td>{{ r.name }}</td>
            <td>{{ r.supplier || '' }}</td>
            <td>{{ r.unit }}</td>
            <td>{{ r.par_level ?? '' }}</td>
            <td class="cs-blank"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'

const store = useIngredientsStore()
const search = ref('')
const onlyLow = ref(false)

onMounted(() => store.fetchAll())

function statusOf(on, par) {
  if (par == null || par === '') {
    if (on == null) return { statusLabel: '—', kind: 'none' }
    return { statusLabel: 'OK', kind: 'ok' }
  }
  const o = Number(on) || 0
  if (o <= 0) return { statusLabel: 'Out', kind: 'out' }
  if (o < par) return { statusLabel: 'Low', kind: 'low' }
  return { statusLabel: 'OK', kind: 'ok' }
}

const enriched = computed(() =>
  store.ingredients.map((i) => {
    const st = statusOf(i.on_hand, i.par_level)
    const o = Number(i.on_hand) || 0
    const reorderQty = i.par_level != null && o < i.par_level ? +(i.par_level - o).toFixed(2) : 0
    const stockValue = o * (Number(i.cost_per_unit) || 0)
    return { ...i, ...st, reorderQty, stockValue }
  })
)

const rows = computed(() => {
  let list = enriched.value
  if (onlyLow.value) list = list.filter((r) => r.reorderQty > 0)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((r) => r.name.toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q))
  }
  return list
})

const reorderList = computed(() => enriched.value.filter((r) => r.reorderQty > 0))
const totalValue = computed(() => enriched.value.reduce((s, r) => s + r.stockValue, 0))
const trackedCount = computed(() => enriched.value.filter((r) => r.on_hand != null || r.par_level != null).length)

function statusStyle(kind) {
  const map = {
    out: { background: 'rgba(248,113,113,.15)', color: '#fca5a5' },
    low: { background: 'rgba(251,191,36,.15)', color: '#fbbf24' },
    ok: { background: 'rgba(52,211,153,.15)', color: '#6ee7b7' },
    none: { background: 'transparent', color: 'var(--text-dim)' },
  }
  return map[kind] || map.none
}

async function setOnHand(r, val) {
  const v = val === '' ? null : parseFloat(val)
  if (val !== '' && (isNaN(v) || v < 0)) return
  await store.setStock(r.id, { on_hand: v, par_level: r.par_level ?? null })
}
async function setPar(r, val) {
  const v = val === '' ? null : parseFloat(val)
  if (val !== '' && (isNaN(v) || v < 0)) return
  await store.setStock(r.id, { on_hand: r.on_hand ?? null, par_level: v })
}

// Count sheet ordered by supplier then name, so counting follows the storeroom.
const countSheet = computed(() =>
  [...store.ingredients].sort(
    (a, b) => (a.supplier || '~').localeCompare(b.supplier || '~') || a.name.localeCompare(b.name)
  )
)

function printCount() {
  window.print()
}

async function copyReorder() {
  const lines = reorderList.value.map(
    (r) => `${r.name}: order ${r.reorderQty} ${r.unit}${r.supplier ? ' (' + r.supplier + ')' : ''}`
  )
  const text = 'Reorder list:\n' + lines.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    alert('Reorder list copied to clipboard!')
  } catch {
    alert(text)
  }
}
</script>

<style scoped>
.inv-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.inv-stat { padding: 18px; text-align: center; }
.inv-stat-val { font-size: 26px; font-weight: 800; }
.inv-stat-label { color: var(--text-dim); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
@media (max-width: 600px) { .inv-summary { grid-template-columns: 1fr; } }

/* Printable stock count sheet — plain paper styling */
.count-sheet { color: #000; background: #fff; padding: 24px 28px; font-family: -apple-system, system-ui, sans-serif; }
.cs-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
.cs-head h2 { margin: 0; font-size: 20px; }
.cs-date { font-size: 12px; color: #444; }
.cs-table { width: 100%; border-collapse: collapse; }
.cs-table th, .cs-table td { text-align: left; padding: 6px 8px; border: 1px solid #999; font-size: 12.5px; }
.cs-table th { background: #f0f0f0; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.04em; }
.cs-blank { width: 90px; }
</style>
