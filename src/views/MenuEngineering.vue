<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Menu Engineering</h1>
        <p class="page-subtitle">See which dishes are Stars and which are Dogs — based on profit and popularity</p>
      </div>
    </div>

    <div class="me-summary">
      <div class="card me-stat" v-for="q in quadrantMeta" :key="q.key" :style="{ borderColor: q.color + '55' }">
        <div class="me-stat-emoji">{{ q.emoji }}</div>
        <div class="me-stat-val" :style="{ color: q.color }">{{ counts[q.key] }}</div>
        <div class="me-stat-label">{{ q.label }}</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:0; overflow:hidden">
      <table class="table" v-if="priced.length">
        <thead>
          <tr>
            <th>Dish</th><th>Price</th><th>Cost</th><th>Margin</th>
            <th style="width:120px">Units sold</th><th>Class</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in classified" :key="r.id">
            <td style="font-weight:600">{{ r.name }}</td>
            <td>{{ cur }}{{ r.price.toFixed(2) }}</td>
            <td style="color:var(--text-dim)">{{ cur }}{{ r.cost.toFixed(2) }}</td>
            <td :style="{ color: r.margin >= avgMargin ? '#6ee7b7' : '#fca5a5', fontWeight:600 }">
              {{ cur }}{{ r.margin.toFixed(2) }}
            </td>
            <td>
              <input :value="r.units ?? ''" @change="setUnits(r, $event.target.value)"
                type="number" min="0" step="any" class="form-input" placeholder="0" style="width:88px" />
            </td>
            <td>
              <span class="me-badge" :style="{ background: r.q.color + '22', color: r.q.color }">
                {{ r.q.emoji }} {{ r.q.label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else style="padding:36px 0">
        <div class="empty-state-title">Set menu prices first</div>
        <div class="empty-state-text">
          Menu engineering needs a selling price per dish. Add prices in
          <RouterLink to="/pricing" style="color:var(--accent)">Menu Pricing</RouterLink>, then enter how many you sold.
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:18px">
      <div class="section-header">What to do</div>
      <div class="me-tips">
        <div v-for="q in quadrantMeta" :key="q.key" class="me-tip">
          <span class="me-badge" :style="{ background: q.color + '22', color: q.color }">{{ q.emoji }} {{ q.label }}</span>
          <span style="color:var(--text-dim); font-size:13px">{{ q.tip }}</span>
        </div>
      </div>
      <p style="color:var(--text-dim); font-size:12.5px; margin:14px 0 0; line-height:1.6">
        A dish is “high profit” if its margin beats the menu average ({{ cur }}{{ avgMargin.toFixed(2) }}), and “popular”
        if it sells at least 70% of the average ({{ popThreshold.toFixed(0) }} units). Classic Kasavana–Smith method.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'

const store = useRecipesStore()

const quadrantMeta = [
  { key: 'star',      emoji: '⭐', label: 'Stars',      color: '#fbbf24', tip: 'High profit, popular. Keep them, feature them prominently, protect the recipe.' },
  { key: 'plowhorse', emoji: '🐴', label: 'Plowhorses', color: '#60a5fa', tip: 'Popular but low profit. Nudge the price up or trim the cost without hurting appeal.' },
  { key: 'puzzle',    emoji: '🧩', label: 'Puzzles',    color: '#c084fc', tip: 'Profitable but slow sellers. Promote, rename, reposition on the menu, or upsell.' },
  { key: 'dog',       emoji: '🐶', label: 'Dogs',       color: '#fca5a5', tip: 'Low profit and unpopular. Consider reworking or removing them from the menu.' },
]

onMounted(() => store.fetchAll())

// Dishes that have a selling price — margin is computable.
const priced = computed(() =>
  store.recipes
    .filter((r) => r.menu_price != null && Number(r.menu_price) > 0)
    .map((r) => {
      const cost = (Number(r.total_cost) || 0) / (Number(r.servings) || 1)
      const price = Number(r.menu_price)
      return { id: r.id, name: r.name, price, cost, margin: price - cost, units: r.units_sold }
    })
)

const avgMargin = computed(() => {
  if (!priced.value.length) return 0
  return priced.value.reduce((s, r) => s + r.margin, 0) / priced.value.length
})

// Popularity threshold = 70% of average units sold (classic menu-engineering rule).
const popThreshold = computed(() => {
  if (!priced.value.length) return 0
  const avgUnits = priced.value.reduce((s, r) => s + (Number(r.units) || 0), 0) / priced.value.length
  return avgUnits * 0.7
})

function quadrantFor(r) {
  const highProfit = r.margin >= avgMargin.value
  const popular = (Number(r.units) || 0) >= popThreshold.value
  const key = highProfit ? (popular ? 'star' : 'puzzle') : (popular ? 'plowhorse' : 'dog')
  return quadrantMeta.find((q) => q.key === key)
}

const classified = computed(() =>
  priced.value.map((r) => ({ ...r, q: quadrantFor(r) }))
)

const counts = computed(() => {
  const c = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 }
  for (const r of classified.value) c[r.q.key]++
  return c
})

async function setUnits(r, val) {
  const v = val === '' ? null : parseFloat(val)
  if (val !== '' && (isNaN(v) || v < 0)) return
  await store.setSales(r.id, v)
}
</script>

<style scoped>
.me-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.me-stat { padding: 16px; text-align: center; border: 1px solid var(--border); }
.me-stat-emoji { font-size: 22px; }
.me-stat-val { font-size: 26px; font-weight: 800; margin-top: 2px; }
.me-stat-label { color: var(--text-dim); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
.me-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.me-tips { display: flex; flex-direction: column; gap: 10px; }
.me-tip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
@media (max-width: 700px) { .me-summary { grid-template-columns: repeat(2, 1fr); } }
</style>
