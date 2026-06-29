<template>
  <div class="page">
    <div class="page-header no-print">
      <div>
        <h1 class="page-title">Spec Sheets</h1>
        <p class="page-subtitle">Print a clean, costed recipe card for the line</p>
      </div>
    </div>

    <div class="card no-print" style="padding:16px; display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap">
      <div style="flex:1; min-width:220px">
        <label class="form-label">Recipe</label>
        <select v-model="recipeId" class="form-input">
          <option :value="null" disabled>Choose a recipe…</option>
          <option v-for="r in recipes" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
      <button class="btn btn-primary" :disabled="!recipe" @click="print">🖨 Print spec sheet</button>
    </div>

    <!-- Printable card (paper styling, light always) -->
    <div v-if="recipe" class="printable">
      <div class="spec-card">
        <div class="spec-top">
          <div>
            <h2 class="spec-title">{{ recipe.name }}</h2>
            <div class="spec-sub">{{ recipe.category || 'Recipe' }} · Yields {{ recipe.servings }} serving{{ recipe.servings !== 1 ? 's' : '' }}</div>
          </div>
          <div class="spec-cost-box">
            <div class="spec-cost-val">${{ costPerServing.toFixed(2) }}</div>
            <div class="spec-cost-label">cost / serving</div>
          </div>
        </div>

        <div class="spec-meta">
          <div><span class="spec-meta-k">Batch cost</span> ${{ totalCost.toFixed(2) }}</div>
          <div v-if="recipe.menu_price"><span class="spec-meta-k">Menu price</span> ${{ Number(recipe.menu_price).toFixed(2) }}</div>
          <div v-if="recipe.menu_price"><span class="spec-meta-k">Food cost</span> {{ foodCostPct.toFixed(1) }}%</div>
          <div v-if="recipe.menu_price"><span class="spec-meta-k">Margin</span> ${{ margin.toFixed(2) }}</div>
        </div>

        <div v-if="allergens.length" class="spec-allergens">
          <span class="spec-meta-k">Contains:</span>
          <span v-for="a in allergens" :key="a" class="spec-allergen">{{ a }}</span>
        </div>

        <table class="spec-table">
          <thead><tr><th>Ingredient</th><th>Quantity</th><th class="spec-r">Cost</th></tr></thead>
          <tbody>
            <tr v-for="l in lines" :key="l.id">
              <td>{{ l.ingredient_name }}</td>
              <td>{{ fmt(l.quantity) }} {{ l.unit }}</td>
              <td class="spec-r">${{ (l.quantity * (Number(l.effective_cost ?? l.cost_per_unit) || 0)).toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td colspan="2" class="spec-r">Total</td><td class="spec-r">${{ totalCost.toFixed(2) }}</td></tr>
          </tfoot>
        </table>

        <div v-if="recipe.notes" class="spec-method">
          <div class="spec-method-h">Method / notes</div>
          <p>{{ recipe.notes }}</p>
        </div>

        <div class="spec-foot">Mise · printed {{ today }}</div>
      </div>
    </div>

    <div v-else class="card no-print" style="margin-top:16px; padding:40px; text-align:center; color:var(--text-dim)">
      Pick a recipe to preview and print its spec sheet.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'

const store = useRecipesStore()
const recipeId = ref(null)
const lines = ref([])

const recipes = computed(() => store.recipes)
const recipe = computed(() => store.recipes.find((r) => r.id === recipeId.value) || null)
const today = new Date().toLocaleDateString()

onMounted(() => store.fetchAll())

watch(recipeId, async (id) => {
  lines.value = id == null ? [] : await store.getIngredients(id)
})

const ALLERGEN_ORDER = [
  'Gluten', 'Dairy', 'Egg', 'Soy', 'Peanut', 'Tree nut', 'Fish', 'Shellfish',
  'Sesame', 'Celery', 'Mustard', 'Sulphites', 'Lupin', 'Molluscs',
]
const allergens = computed(() => {
  const set = new Set()
  for (const l of lines.value) {
    ;(l.allergens || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((a) => set.add(a))
  }
  return ALLERGEN_ORDER.filter((a) => set.has(a)).concat([...set].filter((a) => !ALLERGEN_ORDER.includes(a)))
})

const totalCost = computed(() =>
  lines.value.reduce((s, l) => s + l.quantity * (Number(l.effective_cost ?? l.cost_per_unit) || 0), 0)
)
const costPerServing = computed(() => totalCost.value / (Number(recipe.value?.servings) || 1))
const margin = computed(() => (Number(recipe.value?.menu_price) || 0) - costPerServing.value)
const foodCostPct = computed(() => {
  const p = Number(recipe.value?.menu_price) || 0
  return p ? (costPerServing.value / p) * 100 : 0
})

function fmt(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000
}
function print() {
  window.print()
}
</script>

<style scoped>
.spec-card {
  background: #fff; color: #1a1a1a; max-width: 760px; margin: 16px 0;
  padding: 28px 30px; border-radius: 10px; border: 1px solid #e3e3e3;
  font-family: -apple-system, system-ui, sans-serif;
}
.spec-top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
.spec-title { margin: 0; font-size: 24px; color: #1a1a1a; }
.spec-sub { color: #666; font-size: 13px; margin-top: 4px; }
.spec-cost-box { text-align: right; }
.spec-cost-val { font-size: 26px; font-weight: 800; }
.spec-cost-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
.spec-meta { display: flex; flex-wrap: wrap; gap: 18px; margin: 14px 0; font-size: 13.5px; }
.spec-meta-k { color: #888; margin-right: 5px; }
.spec-allergens { margin-bottom: 14px; font-size: 13px; }
.spec-allergen { display: inline-block; padding: 2px 8px; margin: 2px 4px 2px 0; border: 1px solid #d33; color: #c0392b; border-radius: 4px; font-size: 12px; }
.spec-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
.spec-table th, .spec-table td { text-align: left; padding: 7px 4px; border-bottom: 1px solid #e3e3e3; font-size: 13.5px; }
.spec-table th { color: #888; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
.spec-table tfoot td { font-weight: 700; border-top: 2px solid #1a1a1a; border-bottom: none; }
.spec-r { text-align: right; }
.spec-method { margin-top: 18px; }
.spec-method-h { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
.spec-method p { font-size: 13.5px; line-height: 1.6; color: #333; white-space: pre-wrap; }
.spec-foot { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e3e3e3; font-size: 11px; color: #aaa; }
</style>
