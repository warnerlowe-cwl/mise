<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">Food cost analysis and waste breakdown</p>
      </div>
    </div>

    <!-- Top Stat Row -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Ingredients</div>
        <div class="stat-value">{{ ingredientsStore.ingredients.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Recipes</div>
        <div class="stat-value">{{ recipesStore.recipes.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Cost / Serving</div>
        <div class="stat-value stat-value-green">{{ cur }}{{ avgCostPerServing }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Waste Cost</div>
        <div class="stat-value stat-value-red">{{ cur }}{{ wasteStore.totalWasteCost.toFixed(2) }}</div>
      </div>
    </div>

    <!-- Menu profit (from menu price × units sold) -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">Menu profit · based on units sold</div>
      <template v-if="hasSales">
        <div class="profit-row">
          <div class="profit-stat"><div class="profit-val green">{{ cur }}{{ revenue.toFixed(2) }}</div><div class="profit-label">Revenue</div></div>
          <div class="profit-stat"><div class="profit-val red">{{ cur }}{{ foodCost.toFixed(2) }}</div><div class="profit-label">Food cost</div></div>
          <div class="profit-stat"><div class="profit-val">{{ cur }}{{ grossProfit.toFixed(2) }}</div><div class="profit-label">Gross profit</div></div>
          <div class="profit-stat"><div class="profit-val">{{ blendedPct.toFixed(1) }}%</div><div class="profit-label">Blended food cost</div></div>
        </div>
        <div style="margin-top:16px">
          <div class="rank-sub" style="margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em">Top profit contributors</div>
          <div v-for="(r, idx) in profitContributors" :key="r.id" class="rank-row">
            <div class="rank-badge">{{ idx + 1 }}</div>
            <div class="rank-info">
              <div class="rank-name">{{ r.name }}</div>
              <div class="rank-sub">{{ r.units }} sold · {{ cur }}{{ r.marginEach.toFixed(2) }}/each</div>
            </div>
            <div class="rank-end"><div class="amount-green">{{ cur }}{{ r.profit.toFixed(2) }}</div></div>
          </div>
        </div>
      </template>
      <div v-else class="empty-state" style="padding: 24px 0">
        <div class="empty-state-text">
          Add menu prices (Menu Pricing) and units sold (Menu Engineering) to see revenue, profit, and blended food cost.
        </div>
      </div>
    </div>

    <div class="report-grid">
      <!-- Recipe Cost Ranking -->
      <div class="card">
        <div class="section-header">Recipe Cost Ranking</div>
        <div v-if="sortedRecipes.length">
          <div v-for="(r, idx) in sortedRecipes" :key="r.id" class="rank-row">
            <div class="rank-badge">{{ idx + 1 }}</div>
            <div class="rank-info">
              <div class="rank-name">{{ r.name }}</div>
              <div class="rank-sub">{{ r.servings }} serving{{ r.servings !== 1 ? 's' : '' }}</div>
            </div>
            <div class="rank-end">
              <div class="amount-green">{{ cur }}{{ Number(r.total_cost).toFixed(2) }}</div>
              <div class="rank-sub">{{ cur }}{{ costPerServing(r) }}/srv</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 30px 0">
          <div class="empty-state-text">No recipes to report</div>
        </div>
      </div>

      <!-- Ingredient Cost Ranking -->
      <div class="card">
        <div class="section-header">Most Expensive Ingredients</div>
        <div v-if="sortedIngredients.length">
          <div v-for="(ing, idx) in sortedIngredients" :key="ing.id" class="rank-row">
            <div class="rank-badge">{{ idx + 1 }}</div>
            <div class="rank-info">
              <div class="rank-name">{{ ing.name }}</div>
              <div class="rank-sub">{{ ing.supplier || 'No supplier' }}</div>
            </div>
            <div class="rank-end">
              <div class="amount-accent">{{ cur }}{{ Number(ing.cost_per_unit).toFixed(2) }}</div>
              <div class="rank-sub">per {{ ing.unit }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 30px 0">
          <div class="empty-state-text">No ingredients to report</div>
        </div>
      </div>
    </div>

    <!-- Waste Breakdown -->
    <div class="card bottom-panel">
      <div class="section-header">Waste by Ingredient</div>
      <div v-if="wasteByIngredient.length">
        <table class="table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Total Quantity Wasted</th>
              <th>Times Logged</th>
              <th>Total Waste Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in wasteByIngredient" :key="w.name">
              <td style="color:var(--text);font-weight:500">{{ w.name }}</td>
              <td>{{ w.totalQty.toFixed(2) }} {{ w.unit }}</td>
              <td>{{ w.count }}</td>
              <td style="color: var(--red); font-weight: 600">{{ cur }}{{ w.totalCost.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state" style="padding: 30px 0">
        <div class="empty-state-text">No waste entries to report</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'
import { useRecipesStore } from '../stores/recipes'
import { useWasteStore } from '../stores/waste'

const ingredientsStore = useIngredientsStore()
const recipesStore = useRecipesStore()
const wasteStore = useWasteStore()

onMounted(async () => {
  await Promise.all([
    ingredientsStore.fetchAll(),
    recipesStore.fetchAll(),
    wasteStore.fetchAll(),
  ])
})

const sortedRecipes = computed(() =>
  [...recipesStore.recipes].sort((a, b) => Number(b.total_cost) - Number(a.total_cost))
)

const sortedIngredients = computed(() =>
  [...ingredientsStore.ingredients]
    .sort((a, b) => Number(b.cost_per_unit) - Number(a.cost_per_unit))
    .slice(0, 10)
)

const avgCostPerServing = computed(() => {
  if (!recipesStore.recipes.length) return '0.00'
  const total = recipesStore.recipes.reduce(
    (s, r) => s + Number(r.total_cost) / (r.servings || 1), 0
  )
  return (total / recipesStore.recipes.length).toFixed(2)
})

// Recipes with both a price and units sold drive the profit summary.
const pricedSold = computed(() =>
  recipesStore.recipes
    .filter((r) => Number(r.menu_price) > 0 && Number(r.units_sold) > 0)
    .map((r) => {
      const units = Number(r.units_sold)
      const price = Number(r.menu_price)
      const costEach = Number(r.total_cost) / (r.servings || 1)
      const marginEach = price - costEach
      return { id: r.id, name: r.name, units, price, costEach, marginEach, profit: marginEach * units, revenue: price * units, cost: costEach * units }
    })
)
const hasSales = computed(() => pricedSold.value.length > 0)
const revenue = computed(() => pricedSold.value.reduce((s, r) => s + r.revenue, 0))
const foodCost = computed(() => pricedSold.value.reduce((s, r) => s + r.cost, 0))
const grossProfit = computed(() => revenue.value - foodCost.value)
const blendedPct = computed(() => (revenue.value ? (foodCost.value / revenue.value) * 100 : 0))
const profitContributors = computed(() => [...pricedSold.value].sort((a, b) => b.profit - a.profit).slice(0, 5))

const wasteByIngredient = computed(() => {
  const map = {}
  for (const e of wasteStore.entries) {
    if (!map[e.ingredient_name]) {
      map[e.ingredient_name] = { name: e.ingredient_name, unit: e.unit, totalQty: 0, totalCost: 0, count: 0 }
    }
    map[e.ingredient_name].totalQty += Number(e.quantity)
    map[e.ingredient_name].totalCost += Number(e.waste_cost || 0)
    map[e.ingredient_name].count += 1
  }
  return Object.values(map).sort((a, b) => b.totalCost - a.totalCost)
})

function costPerServing(r) {
  return (Number(r.total_cost) / (r.servings || 1)).toFixed(2)
}
</script>

<style scoped>
.report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.bottom-panel { margin-top: 0; }

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.rank-row:last-child { border-bottom: none; }

.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}
.rank-info { flex: 1; min-width: 0; }
.rank-name { font-weight: 500; color: var(--text); font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.rank-end { text-align: right; flex-shrink: 0; }

.amount-green { color: var(--green); font-weight: 600; font-size: 13.5px; }
.amount-accent { color: var(--accent); font-weight: 600; font-size: 13.5px; }

.profit-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.profit-stat { text-align: center; padding: 8px 0; }
.profit-val { font-size: 24px; font-weight: 800; }
.profit-val.green { color: var(--green); }
.profit-val.red { color: var(--red); }
.profit-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
@media (max-width: 700px) { .profit-row { grid-template-columns: repeat(2, 1fr); } }
</style>
