<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Suppliers</h1>
        <p class="page-subtitle">Everything you buy, grouped by who you buy it from — with a ready order sheet</p>
      </div>
    </div>

    <input v-model="search" class="form-input" placeholder="Search suppliers or ingredients…"
      style="margin:16px 0 4px; max-width:320px" />

    <div v-if="suppliers.length">
      <div v-for="s in suppliers" :key="s.name" class="card sup-card">
        <div class="sup-head">
          <div>
            <div class="sup-name">{{ s.name }}</div>
            <div class="sup-meta">
              {{ s.items.length }} item{{ s.items.length !== 1 ? 's' : '' }}
              <span v-if="s.reorder.length" class="sup-flag">· {{ s.reorder.length }} to reorder</span>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center">
            <button v-if="s.reorder.length" class="btn btn-primary" style="padding:6px 12px; font-size:13px"
              @click="copyOrder(s)">📋 Copy order</button>
            <button v-if="s.name !== 'Unassigned'" class="btn btn-ghost" style="padding:6px 12px; font-size:13px"
              @click="openAdjust(s)">% Adjust prices</button>
            <button class="btn btn-ghost" style="padding:6px 12px; font-size:13px" @click="toggle(s.name)">
              {{ open[s.name] ? 'Hide items' : 'View items' }}
            </button>
          </div>
        </div>

        <!-- Order sheet: items below par -->
        <div v-if="s.reorder.length" class="sup-order">
          <div class="sup-order-title">Order needed</div>
          <div v-for="it in s.reorder" :key="it.id" class="sup-order-row">
            <span>{{ it.name }}</span>
            <span class="sup-order-qty">{{ it.reorderQty }} {{ it.unit }}</span>
          </div>
        </div>

        <!-- Full catalog -->
        <table class="table" v-if="open[s.name]" style="margin-top:8px">
          <thead><tr><th>Ingredient</th><th>Price</th><th>On hand</th><th>Par</th></tr></thead>
          <tbody>
            <tr v-for="it in s.items" :key="it.id">
              <td style="font-weight:600">{{ it.name }}</td>
              <td>{{ cur }}{{ Number(it.cost_per_unit).toFixed(2) }}/{{ it.unit }}</td>
              <td :style="it.low ? 'color:#fbbf24;font-weight:600' : 'color:var(--text-dim)'">
                {{ it.on_hand ?? '—' }}{{ it.on_hand != null ? ' ' + it.unit : '' }}
              </td>
              <td style="color:var(--text-dim)">{{ it.par_level ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="card" style="margin-top:12px; padding:40px; text-align:center; color:var(--text-dim)">
      {{ search ? 'No matches.' : 'No suppliers yet — add a supplier name on your ingredients and they\'ll group here.' }}
    </div>

    <!-- Bulk price adjustment -->
    <div v-if="adjust" class="modal-overlay" @click.self="adjust = null">
      <div class="modal">
        <h2 class="modal-title">Adjust prices — {{ adjust.name }}</h2>
        <p style="color:var(--text-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6">
          Apply a percentage change to all <strong style="color:var(--text)">{{ adjust.items.length }}</strong>
          ingredients from {{ adjust.name }}. Use a negative number to reduce. Each change is logged to Price Trends.
        </p>
        <label class="form-label">Change (%)</label>
        <input v-model.number="adjustPct" type="number" step="any" class="form-input" placeholder="e.g. 5 or -3"
          style="max-width:160px" @keydown.enter="applyAdjust" />
        <p v-if="isFinitePct" style="font-size:13px; color:var(--text-dim); margin-top:10px">
          Example: {{ cur }}{{ sampleOld.toFixed(2) }} → <strong :style="{ color: adjustPct >= 0 ? '#fca5a5' : '#6ee7b7' }">{{ cur }}{{ sampleNew.toFixed(2) }}</strong>
        </p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="adjust = null" :disabled="applying">Cancel</button>
          <button class="btn btn-primary" @click="applyAdjust" :disabled="applying || !isFinitePct || adjustPct == 0">
            {{ applying ? 'Applying…' : 'Apply' }}
          </button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 Mise groups ingredients by the <strong style="color:var(--text)">supplier</strong> you set on each one.
        When stock drops below par, that supplier shows an <strong style="color:var(--text)">Order needed</strong>
        sheet — hit <strong style="color:var(--text)">Copy order</strong> to send each vendor exactly their list,
        not one big mixed order.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'

const store = useIngredientsStore()
const search = ref('')
const open = ref({})
const adjust = ref(null)      // the supplier group being adjusted
const adjustPct = ref(null)
const applying = ref(false)

onMounted(() => store.fetchAll())

const isFinitePct = computed(() => Number.isFinite(Number(adjustPct.value)))
const sampleOld = computed(() => Number(adjust.value?.items?.[0]?.cost_per_unit) || 0)
const sampleNew = computed(() => round2(sampleOld.value * (1 + (Number(adjustPct.value) || 0) / 100)))

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function openAdjust(s) {
  adjust.value = s
  adjustPct.value = null
}

async function applyAdjust() {
  const pct = Number(adjustPct.value)
  if (!Number.isFinite(pct) || pct === 0) return
  applying.value = true
  try {
    for (const it of adjust.value.items) {
      const newCost = round2(Number(it.cost_per_unit) * (1 + pct / 100))
      await store.update(it.id, {
        name: it.name, unit: it.unit, cost_per_unit: newCost, supplier: it.supplier, notes: it.notes,
      })
    }
    adjust.value = null
  } finally {
    applying.value = false
  }
}

function toggle(name) {
  open.value[name] = !open.value[name]
}

const suppliers = computed(() => {
  const q = search.value.toLowerCase()
  const groups = {}
  for (const i of store.ingredients) {
    const name = (i.supplier || '').trim() || 'Unassigned'
    const o = Number(i.on_hand) || 0
    const low = i.par_level != null && o < Number(i.par_level)
    const reorderQty = low ? +(Number(i.par_level) - o).toFixed(2) : 0
    const item = { ...i, low, reorderQty }
    ;(groups[name] ||= { name, items: [], reorder: [] }).items.push(item)
    if (reorderQty > 0) groups[name].reorder.push(item)
  }
  let list = Object.values(groups)
  // Sort items within each supplier by name.
  for (const g of list) g.items.sort((a, b) => a.name.localeCompare(b.name))
  if (q) {
    list = list.filter(
      (g) => g.name.toLowerCase().includes(q) || g.items.some((it) => it.name.toLowerCase().includes(q))
    )
  }
  // Suppliers with reorders first, then alphabetical (Unassigned last).
  return list.sort((a, b) => {
    if (!!b.reorder.length !== !!a.reorder.length) return b.reorder.length - a.reorder.length
    if (a.name === 'Unassigned') return 1
    if (b.name === 'Unassigned') return -1
    return a.name.localeCompare(b.name)
  })
})

async function copyOrder(s) {
  const lines = s.reorder.map((it) => `${it.name}: ${it.reorderQty} ${it.unit}`)
  const text = `Order for ${s.name}:\n` + lines.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    alert(`Order for ${s.name} copied to clipboard!`)
  } catch {
    alert(text)
  }
}
</script>

<style scoped>
.sup-card { margin-top: 12px; padding: 16px; }
.sup-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.sup-name { font-weight: 700; font-size: 16px; }
.sup-meta { color: var(--text-dim); font-size: 13px; margin-top: 2px; }
.sup-flag { color: #fbbf24; font-weight: 600; }
.sup-order { margin-top: 12px; padding: 10px 12px; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25); border-radius: 8px; }
.sup-order-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #fbbf24; margin-bottom: 6px; }
.sup-order-row { display: flex; justify-content: space-between; font-size: 13.5px; padding: 3px 0; }
.sup-order-qty { font-weight: 600; }
</style>
