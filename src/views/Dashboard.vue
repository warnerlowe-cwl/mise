<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Your kitchen at a glance</p>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon-box stat-icon-amber">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 2H6.5a1 1 0 00-.7.3L2.5 5.6a1 1 0 000 1.4l6 6a1 1 0 001.4 0l3.1-3.1a1 1 0 000-1.4L9.7 2.7A1 1 0 009 2z"/>
            <circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div class="stat-label">Ingredients</div>
        <div class="stat-value">{{ ingredientsStore.totalIngredients }}</div>
        <div class="stat-sub">in your pantry</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-box stat-icon-blue">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 1.5h6l3.5 3.5V13.5H3V1.5z"/>
            <path d="M9 1.5v3.5h3.5"/>
            <path d="M5 7h5M5 9.5h3.5"/>
          </svg>
        </div>
        <div class="stat-label">Recipes</div>
        <div class="stat-value">{{ recipesStore.totalRecipes }}</div>
        <div class="stat-sub">costed recipes</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-box stat-icon-red">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.5 13C5 13 3 11 3 8.5 3 6.5 4.5 5 5.5 4c.5 1.5 1 2 1.5 1.5C6.5 4 7.5 3 8.5 2.5c0 1.5 1 2.5 2 2.5.5 0 1-1 2-1C12 5 12 7 11.5 8.5 10.5 11 9.5 13 7.5 13z"/>
          </svg>
        </div>
        <div class="stat-label">Waste This Week</div>
        <div class="stat-value stat-value-red">${{ wasteStore.weeklyWasteCost.toFixed(2) }}</div>
        <div class="stat-sub">in logged waste</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-box stat-icon-green">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.5 2v11"/>
            <path d="M10 4.5H6A1.5 1.5 0 006 7.5h3a1.5 1.5 0 010 3H4.5"/>
          </svg>
        </div>
        <div class="stat-label">Avg Recipe Cost</div>
        <div class="stat-value stat-value-green">${{ avgRecipeCost }}</div>
        <div class="stat-sub">per recipe</div>
      </div>
    </div>

    <!-- Panels -->
    <div class="panel-grid">
      <div class="card">
        <div class="section-header">Top Recipes by Cost</div>
        <div v-if="topRecipes.length">
          <div v-for="r in topRecipes" :key="r.id" class="list-row">
            <div>
              <div class="list-row-primary">{{ r.name }}</div>
              <div class="list-row-secondary">{{ r.servings }} serving{{ r.servings !== 1 ? 's' : '' }}</div>
            </div>
            <div class="list-row-end">
              <div class="amount-green">${{ Number(r.total_cost).toFixed(2) }}</div>
              <div class="list-row-secondary">${{ costPerServing(r) }}/serving</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 30px 0">
          <div class="empty-state-text">No recipes yet</div>
        </div>
      </div>

      <div class="card">
        <div class="section-header">Recent Waste</div>
        <div v-if="recentWaste.length">
          <div v-for="w in recentWaste" :key="w.id" class="list-row">
            <div>
              <div class="list-row-primary">{{ w.ingredient_name }}</div>
              <div class="list-row-secondary">{{ w.quantity }} {{ w.unit }}{{ w.reason ? ' · ' + w.reason : '' }}</div>
            </div>
            <div class="amount-red">${{ Number(w.waste_cost).toFixed(2) }}</div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 30px 0">
          <div class="empty-state-text">No waste logged yet</div>
        </div>
      </div>
    </div>

    <!-- Most Costly Ingredients -->
    <div class="card bottom-panel">
      <div class="section-header">Most Expensive Ingredients</div>
      <div v-if="topIngredients.length" class="ing-chips">
        <div v-for="ing in topIngredients" :key="ing.id" class="ing-chip">
          <div class="ing-chip-name">{{ ing.name }}</div>
          <div class="ing-chip-cost">${{ Number(ing.cost_per_unit).toFixed(2) }}</div>
          <div class="ing-chip-unit">per {{ ing.unit }}</div>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 30px 0">
        <div class="empty-state-text">No ingredients yet</div>
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

const topRecipes = computed(() =>
  [...recipesStore.recipes]
    .sort((a, b) => Number(b.total_cost) - Number(a.total_cost))
    .slice(0, 5)
)

const recentWaste = computed(() => wasteStore.entries.slice(0, 5))

const topIngredients = computed(() =>
  [...ingredientsStore.ingredients]
    .sort((a, b) => Number(b.cost_per_unit) - Number(a.cost_per_unit))
    .slice(0, 6)
)

const avgRecipeCost = computed(() => {
  if (!recipesStore.recipes.length) return '0.00'
  const total = recipesStore.recipes.reduce((s, r) => s + Number(r.total_cost), 0)
  return (total / recipesStore.recipes.length).toFixed(2)
})

function costPerServing(r) {
  return (Number(r.total_cost) / (r.servings || 1)).toFixed(2)
}
</script>

<style scoped>
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.stat-value-red { color: var(--red); }
.stat-value-green { color: var(--green); }

.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.list-row:last-child { border-bottom: none; }

.list-row-primary { font-weight: 500; color: var(--text); font-size: 13.5px; }
.list-row-secondary { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.list-row-end { text-align: right; }

.amount-green { color: var(--green); font-weight: 600; font-size: 13.5px; }
.amount-red { color: var(--red); font-weight: 600; font-size: 13.5px; }

.bottom-panel { margin-top: 20px; }

.ing-chips { display: flex; gap: 12px; flex-wrap: wrap; }
.ing-chip {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 140px;
  transition: border-color 0.15s;
}
.ing-chip:hover { border-color: rgba(245,158,11,0.4); }
.ing-chip-name { font-weight: 600; color: var(--text); font-size: 13px; }
.ing-chip-cost { color: var(--accent); font-size: 16px; font-weight: 700; margin-top: 4px; }
.ing-chip-unit { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
</style>
