<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Menu Pricing</h1>
        <p class="page-subtitle">Price each dish to hit your target food cost</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        <label class="form-label" style="margin:0; white-space:nowrap">Default target food cost</label>
        <input v-model.number="defaultTarget" class="form-input" type="number" min="1" max="95" style="width:70px" />
        <span style="color:var(--text-dim)">%</span>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:0; overflow:hidden">
      <table class="table" v-if="rows.length">
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Cost / serving</th>
            <th>Target %</th>
            <th>Suggested price</th>
            <th>Your menu price</th>
            <th>Food cost %</th>
            <th>Margin / serving</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>
              <div style="font-weight:600">{{ r.name }}</div>
              <div style="color:var(--text-dim); font-size:12px">
                {{ r.servings }} serving{{ r.servings === 1 ? '' : 's' }} · ${{ r.total_cost.toFixed(2) }} total
              </div>
            </td>
            <td>${{ r.costPerServing.toFixed(2) }}</td>
            <td>
              <input
                :value="r.target"
                @change="setTarget(r, $event.target.value)"
                class="form-input" type="number" min="1" max="95" style="width:62px"
              />
            </td>
            <td>
              <button class="suggest-btn" @click="setPrice(r, r.suggested.toFixed(2))" title="Use this price">
                ${{ r.suggested.toFixed(2) }}
              </button>
            </td>
            <td>
              <input
                :value="r.menu_price ?? ''"
                @change="setPrice(r, $event.target.value)"
                class="form-input" type="number" step="0.01" min="0" placeholder="—" style="width:90px"
              />
            </td>
            <td>
              <span v-if="r.menu_price"
                class="badge"
                :style="{
                  background: r.actualFCpct <= r.target ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)',
                  color: r.actualFCpct <= r.target ? '#6ee7b7' : '#fca5a5'
                }"
              >{{ r.actualFCpct.toFixed(0) }}%</span>
              <span v-else style="color:var(--text-dim)">—</span>
            </td>
            <td>
              <span v-if="r.menu_price" :style="{ color: r.margin >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight:600 }">
                ${{ r.margin.toFixed(2) }}
              </span>
              <span v-else style="color:var(--text-dim)">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" v-else>
        <div class="empty-state-title">No recipes to price yet</div>
        <div class="empty-state-text">Add some recipes first, then price them here.</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 <strong style="color:var(--text)">How pricing works:</strong>
        Food cost % = ingredient cost ÷ menu price. To hit a <strong style="color:var(--text)">30%</strong>
        target on a dish that costs <strong style="color:var(--text)">$4.50</strong> per serving, you'd charge
        <strong style="color:var(--amber)">$15.00</strong>. A <span style="color:#6ee7b7">green</span> food-cost %
        means you're at or under target (healthy margin); <span style="color:#fca5a5">red</span> means the price is
        too low for your target. Click a <strong style="color:var(--amber)">suggested price</strong> to apply it.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'

const store = useRecipesStore()
const defaultTarget = ref(30)

onMounted(() => store.fetchAll())

const rows = computed(() =>
  store.recipes.map((r) => {
    const servings = r.servings || 1
    const costPerServing = (r.total_cost || 0) / servings
    const target = r.target_food_cost_pct || defaultTarget.value
    const suggested = target > 0 ? costPerServing / (target / 100) : 0
    const menu_price = r.menu_price
    const actualFCpct = menu_price > 0 ? (costPerServing / menu_price) * 100 : 0
    const margin = menu_price > 0 ? menu_price - costPerServing : 0
    return { ...r, servings, costPerServing, target, suggested, menu_price, actualFCpct, margin }
  })
)

async function setTarget(r, val) {
  const t = parseFloat(val)
  if (isNaN(t) || t <= 0) return
  await store.setPricing(r.id, { target_food_cost_pct: t, menu_price: r.menu_price ?? null })
}

async function setPrice(r, val) {
  const p = val === '' || val == null ? null : parseFloat(val)
  if (val !== '' && val != null && (isNaN(p) || p < 0)) return
  await store.setPricing(r.id, {
    target_food_cost_pct: r.target_food_cost_pct ?? defaultTarget.value,
    menu_price: p,
  })
}
</script>

<style scoped>
.suggest-btn {
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: var(--amber, #fbbf24);
  border-radius: 7px;
  padding: 4px 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.suggest-btn:hover {
  background: rgba(251, 191, 36, 0.22);
}
</style>
