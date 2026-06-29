<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Price Trends</h1>
        <p class="page-subtitle">Track what your suppliers charge over time and catch cost creep early</p>
      </div>
    </div>

    <div class="pt-summary">
      <div class="card pt-stat">
        <div class="pt-stat-val" style="color:#fca5a5">{{ wentUp.length }} ▲</div>
        <div class="pt-stat-label">Got more expensive</div>
      </div>
      <div class="card pt-stat">
        <div class="pt-stat-val" style="color:#6ee7b7">{{ wentDown.length }} ▼</div>
        <div class="pt-stat-label">Got cheaper</div>
      </div>
      <div class="card pt-stat">
        <div class="pt-stat-val" :style="{ color: avgChange > 0 ? '#fca5a5' : avgChange < 0 ? '#6ee7b7' : 'var(--text)' }">
          {{ avgChange > 0 ? '+' : '' }}{{ avgChange.toFixed(1) }}%
        </div>
        <div class="pt-stat-label">Average change</div>
      </div>
    </div>

    <div style="margin-top:16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap">
      <input v-model="search" class="form-input" placeholder="Search ingredients…" style="flex:1; min-width:180px" />
      <label style="display:flex; align-items:center; gap:6px; color:var(--text-dim); white-space:nowrap; cursor:pointer">
        <input type="checkbox" v-model="onlyChanged" /> Only show price changes
      </label>
    </div>

    <div class="card" style="margin-top:12px; padding:0; overflow:hidden">
      <table class="table" v-if="rows.length">
        <thead>
          <tr>
            <th>Ingredient</th><th>First price</th><th>Current price</th>
            <th>Change</th><th>Last change</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>
              <div style="font-weight:600">{{ r.name }}</div>
              <div style="color:var(--text-dim); font-size:12px">
                {{ r.supplier || 'No supplier' }} · per {{ r.unit }}
              </div>
            </td>
            <td>{{ cur }}{{ r.first.toFixed(2) }}</td>
            <td style="font-weight:600">{{ cur }}{{ r.current.toFixed(2) }}</td>
            <td>
              <span v-if="r.points > 1" :style="changeStyle(r.pct)">
                {{ r.pct > 0 ? '▲' : r.pct < 0 ? '▼' : '' }}
                {{ r.pct > 0 ? '+' : '' }}{{ r.pct.toFixed(1) }}%
              </span>
              <span v-else style="color:var(--text-dim); font-size:12px">no change yet</span>
            </td>
            <td style="color:var(--text-dim); font-size:13px">{{ fmtDate(r.lastChange) }}</td>
            <td style="text-align:right">
              <button class="btn btn-ghost" style="padding:4px 10px; font-size:12px"
                @click="openHistory(r)" :disabled="r.points < 2">History</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <div class="empty-state-title">{{ onlyChanged ? 'No price changes yet' : 'No ingredients yet' }}</div>
        <div class="empty-state-text">
          {{ onlyChanged
            ? 'Edit an ingredient\'s cost and the change will show up here.'
            : 'Add ingredients and Mise starts tracking their price from day one.' }}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 Every time you change an ingredient's <strong style="color:var(--text)">cost per unit</strong>,
        Mise logs it here. Over a few months you'll see which suppliers keep nudging prices up — and by
        how much — so you can renegotiate, swap suppliers, or reprice your menu before margins slip.
      </p>
    </div>

    <!-- History detail modal -->
    <div v-if="detail" class="pt-overlay" @click.self="detail = null">
      <div class="card pt-modal">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:4px">
          <div>
            <h2 style="margin:0">{{ detail.name }}</h2>
            <div style="color:var(--text-dim); font-size:13px">{{ detail.supplier || 'No supplier' }} · per {{ detail.unit }}</div>
          </div>
          <button class="btn btn-ghost" @click="detail = null">✕</button>
        </div>

        <div style="margin:14px 0; display:flex; align-items:baseline; gap:10px">
          <div style="font-size:28px; font-weight:800">{{ cur }}{{ detail.current.toFixed(2) }}</div>
          <span :style="changeStyle(detail.pct)">
            {{ detail.pct > 0 ? '▲ +' : detail.pct < 0 ? '▼ ' : '' }}{{ detail.pct.toFixed(1) }}%
            <span style="color:var(--text-dim); font-weight:400">since {{ cur }}{{ detail.first.toFixed(2) }}</span>
          </span>
        </div>

        <table class="table">
          <thead><tr><th>Date</th><th>Price</th><th>Change</th></tr></thead>
          <tbody>
            <tr v-for="(h, i) in detail.history" :key="i">
              <td style="color:var(--text-dim)">{{ fmtDate(h.recorded_at) }}</td>
              <td style="font-weight:600">{{ cur }}{{ Number(h.cost_per_unit).toFixed(2) }}</td>
              <td>
                <span v-if="i > 0" :style="changeStyle(stepPct(detail.history, i))">
                  {{ stepPct(detail.history, i) > 0 ? '▲ +' : stepPct(detail.history, i) < 0 ? '▼ ' : '' }}{{ stepPct(detail.history, i).toFixed(1) }}%
                </span>
                <span v-else style="color:var(--text-dim); font-size:12px">starting price</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'

const store = useIngredientsStore()
const search = ref('')
const onlyChanged = ref(false)
const detail = ref(null)

onMounted(async () => {
  await store.fetchAll()
  await store.loadPriceHistory()
})

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z'))
  if (isNaN(d)) return s
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function changeStyle(pct) {
  const color = pct > 0 ? '#fca5a5' : pct < 0 ? '#6ee7b7' : 'var(--text-dim)'
  return { color, fontWeight: 600 }
}

// % change between two adjacent history points.
function stepPct(history, i) {
  const prev = Number(history[i - 1].cost_per_unit)
  const cur = Number(history[i].cost_per_unit)
  if (!prev) return 0
  return ((cur - prev) / prev) * 100
}

const enriched = computed(() =>
  store.ingredients.map((i) => {
    const history = store.priceHistory[i.id] || []
    const first = history.length ? Number(history[0].cost_per_unit) : Number(i.cost_per_unit) || 0
    const current = Number(i.cost_per_unit) || 0
    const pct = first ? ((current - first) / first) * 100 : 0
    const points = history.length
    const lastChange = points > 1 ? history[points - 1].recorded_at : history[0]?.recorded_at
    return { ...i, history, first, current, pct, points, lastChange }
  })
)

const changed = computed(() => enriched.value.filter((r) => r.points > 1 && Math.abs(r.pct) > 0.01))
const wentUp = computed(() => changed.value.filter((r) => r.pct > 0))
const wentDown = computed(() => changed.value.filter((r) => r.pct < 0))
const avgChange = computed(() => {
  if (!changed.value.length) return 0
  return changed.value.reduce((s, r) => s + r.pct, 0) / changed.value.length
})

const rows = computed(() => {
  let list = enriched.value
  if (onlyChanged.value) list = list.filter((r) => r.points > 1 && Math.abs(r.pct) > 0.01)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((r) => r.name.toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q))
  }
  // Biggest movers (by absolute % change) first.
  return [...list].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
})

function openHistory(r) {
  detail.value = r
}
</script>

<style scoped>
.pt-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.pt-stat { padding: 18px; text-align: center; }
.pt-stat-val { font-size: 26px; font-weight: 800; }
.pt-stat-label { color: var(--text-dim); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
@media (max-width: 600px) { .pt-summary { grid-template-columns: 1fr; } }

.pt-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 100;
}
.pt-modal { width: 100%; max-width: 560px; max-height: 85vh; overflow-y: auto; padding: 22px; }
</style>
