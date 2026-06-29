<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Batch Calculator</h1>
        <p class="page-subtitle">Scale any recipe to the portions you need — with a ready-to-shop ingredient list</p>
      </div>
    </div>

    <div class="card" style="padding:18px; margin-top:16px">
      <div class="sc-controls">
        <div style="flex:2; min-width:200px">
          <label class="form-label">Recipe</label>
          <select v-model="recipeId" class="form-input">
            <option :value="null" disabled>Choose a recipe…</option>
            <option v-for="r in recipes" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div style="flex:1; min-width:120px">
          <label class="form-label">Scale to servings</label>
          <input v-model.number="targetServings" type="number" min="0" step="any" class="form-input"
            :disabled="!recipe" @input="fromServings" />
        </div>
        <div style="flex:1; min-width:110px">
          <label class="form-label">Multiplier</label>
          <input v-model.number="multiplier" type="number" min="0" step="any" class="form-input"
            :disabled="!recipe" @input="fromMultiplier" />
        </div>
      </div>

      <div v-if="recipe" class="sc-quick">
        <span style="color:var(--text-dim); font-size:13px; margin-right:4px">Quick:</span>
        <button v-for="f in [0.5, 1, 2, 3, 4, 6, 10]" :key="f" class="btn btn-ghost sc-chip"
          :class="{ 'sc-chip-on': Math.abs(multiplier - f) < 1e-9 }" @click="setFactor(f)">
          {{ f === 0.5 ? '½×' : f + '×' }}
        </button>
      </div>
    </div>

    <template v-if="recipe">
      <div class="sc-summary">
        <div class="card sc-stat">
          <div class="sc-stat-val">{{ fmtQty(targetServings) }}</div>
          <div class="sc-stat-label">Servings</div>
        </div>
        <div class="card sc-stat">
          <div class="sc-stat-val">{{ cur }}{{ scaledCost.toFixed(2) }}</div>
          <div class="sc-stat-label">Batch cost</div>
        </div>
        <div class="card sc-stat">
          <div class="sc-stat-val">{{ cur }}{{ costPerServing.toFixed(2) }}</div>
          <div class="sc-stat-label">Cost / serving</div>
        </div>
        <div class="card sc-stat">
          <div class="sc-stat-val">{{ fmtQty(multiplier) }}×</div>
          <div class="sc-stat-label">Scale factor</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px; padding:0; overflow:hidden">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px">
          <strong>Ingredients for {{ fmtQty(targetServings) }} servings</strong>
          <button class="btn btn-ghost" @click="copyList" :disabled="!lines.length">📋 Copy shopping list</button>
        </div>
        <table class="table" v-if="lines.length">
          <thead>
            <tr><th>Ingredient</th><th>Original</th><th>Scaled</th><th>Cost</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in lines" :key="l.id">
              <td style="font-weight:600">{{ l.ingredient_name }}</td>
              <td style="color:var(--text-dim)">{{ fmtQty(l.quantity) }} {{ l.unit }}</td>
              <td style="font-weight:600">{{ fmtQty(l.quantity * multiplier) }} {{ l.unit }}</td>
              <td>{{ cur }}{{ (l.quantity * multiplier * (Number(l.effective_cost ?? l.cost_per_unit) || 0)).toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="border-top:1px solid var(--border)">
              <td colspan="3" style="text-align:right; font-weight:600">Total</td>
              <td style="font-weight:700">{{ cur }}{{ scaledCost.toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>
        <div class="empty-state" v-else>
          <div class="empty-state-title">This recipe has no ingredients yet</div>
          <div class="empty-state-text">Add ingredients to the recipe, then come back to scale it.</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px; padding:16px">
        <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
          💡 Need 60 covers tonight but the recipe makes 12? Type <strong style="color:var(--text)">60</strong>
          into “Scale to servings” and Mise multiplies every ingredient for you, totals the batch cost, and
          gives you a shopping list to copy straight into an order. No math, no over-buying.
        </p>
      </div>
    </template>

    <div v-else class="card" style="margin-top:16px; padding:40px; text-align:center; color:var(--text-dim)">
      Pick a recipe above to scale it.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'
import { currency } from '../currency'

const store = useRecipesStore()
const recipeId = ref(null)
const targetServings = ref(0)
const multiplier = ref(1)
const lines = ref([])

const recipes = computed(() => store.recipes)
const recipe = computed(() => store.recipes.find((r) => r.id === recipeId.value) || null)

onMounted(() => store.fetchAll())

// When a new recipe is picked, load its lines and reset the scale to 1× (its own yield).
watch(recipeId, async (id) => {
  if (id == null) { lines.value = []; return }
  lines.value = await store.getExpandedIngredients(id)
  multiplier.value = 1
  targetServings.value = Number(recipe.value?.servings) || 1
})

const baseServings = computed(() => Number(recipe.value?.servings) || 1)

function fromServings() {
  const t = Number(targetServings.value)
  if (t > 0 && baseServings.value > 0) multiplier.value = round(t / baseServings.value)
}
function fromMultiplier() {
  const m = Number(multiplier.value)
  if (m >= 0) targetServings.value = round(m * baseServings.value)
}
function setFactor(f) {
  multiplier.value = f
  targetServings.value = round(f * baseServings.value)
}

const scaledCost = computed(() =>
  lines.value.reduce((s, l) => s + l.quantity * multiplier.value * (Number(l.effective_cost ?? l.cost_per_unit) || 0), 0)
)
const costPerServing = computed(() => {
  const t = Number(targetServings.value)
  return t > 0 ? scaledCost.value / t : 0
})

function round(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000
}
// Trim trailing zeros, keep up to 3 decimals.
function fmtQty(n) {
  const v = round(n)
  return Number.isInteger(v) ? String(v) : String(v)
}

async function copyList() {
  const header = `${recipe.value.name} — ${fmtQty(targetServings.value)} servings (${fmtQty(multiplier.value)}× batch)`
  const body = lines.value.map((l) => `${l.ingredient_name}: ${fmtQty(l.quantity * multiplier.value)} ${l.unit}`)
  const text = header + '\n' + body.join('\n') + `\nBatch cost: ${currency.value}${scaledCost.value.toFixed(2)}`
  try {
    await navigator.clipboard.writeText(text)
    alert('Shopping list copied to clipboard!')
  } catch {
    alert(text)
  }
}
</script>

<style scoped>
.sc-controls { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
.sc-quick { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
.sc-chip { padding: 5px 12px; font-size: 13px; }
.sc-chip-on { background: var(--accent, #6366f1); color: #fff; border-color: transparent; }
.sc-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.sc-stat { padding: 18px; text-align: center; }
.sc-stat-val { font-size: 24px; font-weight: 800; }
.sc-stat-label { color: var(--text-dim); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
@media (max-width: 700px) { .sc-summary { grid-template-columns: repeat(2, 1fr); } }
</style>
