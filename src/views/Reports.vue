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
        <div class="stat-value stat-value-green">${{ avgCostPerServing }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Waste Cost</div>
        <div class="stat-value stat-value-red">${{ wasteStore.totalWasteCost.toFixed(2) }}</div>
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
              <div class="amount-green">${{ Number(r.total_cost).toFixed(2) }}</div>
              <div class="rank-sub">${{ costPerServing(r) }}/srv</div>
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
              <div class="amount-accent">${{ Number(ing.cost_per_unit).toFixed(2) }}</div>
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
              <td style="color: var(--red); font-weight: 600">${{ w.totalCost.toFixed(2) }}</td>
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
</style>
