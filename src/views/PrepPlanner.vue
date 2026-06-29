<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Prep Planner</h1>
        <p class="page-subtitle">Enter what you're making today and get one combined shopping list</p>
      </div>
    </div>

    <div class="pp-grid">
      <!-- Pick recipes + servings -->
      <div class="card" style="padding:0; overflow:hidden">
        <div class="section-header" style="padding:14px 16px 0">Today's menu</div>
        <table class="table" v-if="recipes.length">
          <thead><tr><th>Recipe</th><th style="width:130px">Servings to make</th></tr></thead>
          <tbody>
            <tr v-for="r in recipes" :key="r.id">
              <td>
                <div style="font-weight:600">{{ r.name }}</div>
                <div style="color:var(--text-dim); font-size:12px">recipe makes {{ r.servings }}</div>
              </td>
              <td>
                <input :value="plan[r.id] ?? ''" @input="setQty(r.id, $event.target.value)"
                  type="number" min="0" step="any" class="form-input" placeholder="0" style="width:96px" />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty-state" v-else style="padding:30px 0">
          <div class="empty-state-text">No recipes yet — add some first.</div>
        </div>
      </div>

      <!-- Combined shopping list -->
      <div class="card" style="padding:0; overflow:hidden">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px">
          <strong>Shopping list</strong>
          <button class="btn btn-ghost" style="padding:5px 11px; font-size:13px"
            @click="copyList" :disabled="!shopping.length">📋 Copy</button>
        </div>
        <table class="table" v-if="shopping.length">
          <thead><tr><th>Ingredient</th><th>Total</th><th>Cost</th></tr></thead>
          <tbody>
            <tr v-for="it in shopping" :key="it.key">
              <td style="font-weight:600">{{ it.name }}</td>
              <td>{{ fmt(it.qty) }} {{ it.unit }}</td>
              <td>{{ cur }}{{ it.cost.toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="border-top:1px solid var(--border)">
              <td style="font-weight:600">{{ activeCount }} recipe{{ activeCount !== 1 ? 's' : '' }}</td>
              <td style="text-align:right; font-weight:600">Total</td>
              <td style="font-weight:700">{{ cur }}{{ totalCost.toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>
        <div class="empty-state" v-else style="padding:40px 0">
          <div class="empty-state-text">Enter servings on the left to build your list.</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 Planning a service? Punch in how many of each dish you expect to sell. Mise scales every
        recipe, <strong style="color:var(--text)">merges shared ingredients</strong> (flour used in three
        dishes shows once, totalled), and gives you a single costed shopping list to prep or order from.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'
import { currency } from '../currency'

const store = useRecipesStore()
const plan = reactive({})           // recipeId -> servings to make
const recipeLines = ref({})         // recipeId -> ingredient lines

const recipes = computed(() => store.recipes)

onMounted(async () => {
  await store.fetchAll()
  const map = {}
  for (const r of store.recipes) map[r.id] = await store.getExpandedIngredients(r.id)
  recipeLines.value = map
})

function setQty(id, val) {
  const v = parseFloat(val)
  plan[id] = val === '' || isNaN(v) || v < 0 ? null : v
}

const activeCount = computed(() => Object.values(plan).filter((v) => v > 0).length)

// Scale each planned recipe and merge shared ingredients (by ingredient + unit).
const shopping = computed(() => {
  const agg = {}
  for (const r of store.recipes) {
    const want = Number(plan[r.id]) || 0
    if (want <= 0) continue
    const base = Number(r.servings) || 1
    const factor = want / base
    for (const l of recipeLines.value[r.id] || []) {
      const key = l.ingredient_id + '|' + (l.unit || '')
      const qty = Number(l.quantity) * factor
      const cost = qty * (Number(l.effective_cost ?? l.cost_per_unit) || 0)
      if (!agg[key]) agg[key] = { key, name: l.ingredient_name, unit: l.unit, qty: 0, cost: 0 }
      agg[key].qty += qty
      agg[key].cost += cost
    }
  }
  return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name))
})

const totalCost = computed(() => shopping.value.reduce((s, it) => s + it.cost, 0))

function fmt(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000
}

async function copyList() {
  const lines = shopping.value.map((it) => `${it.name}: ${fmt(it.qty)} ${it.unit}`)
  const text = 'Prep shopping list:\n' + lines.join('\n') + `\nTotal cost: ${currency.value}${totalCost.value.toFixed(2)}`
  try {
    await navigator.clipboard.writeText(text)
    alert('Shopping list copied to clipboard!')
  } catch {
    alert(text)
  }
}
</script>

<style scoped>
.pp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; align-items: start; }
@media (max-width: 800px) { .pp-grid { grid-template-columns: 1fr; } }
</style>
