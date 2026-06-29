<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Allergens</h1>
        <p class="page-subtitle">Tag ingredients once — every recipe inherits its allergens automatically</p>
      </div>
    </div>

    <!-- Menu allergens: auto-derived from each recipe's ingredients -->
    <h2 class="al-h2">Menu allergens</h2>
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px">
      <span style="color:var(--text-dim); font-size:13px">Show only “free from”:</span>
      <button v-for="a in ALLERGENS" :key="a" class="al-chip"
        :class="{ 'al-chip-on': freeFrom.has(a) }" @click="toggleFree(a)">{{ a }}</button>
      <button v-if="freeFrom.size" class="al-chip" @click="freeFrom = new Set()" style="border-style:dashed">Clear</button>
    </div>
    <div class="card" style="padding:0; overflow:hidden">
      <table class="table" v-if="filteredRecipeRows.length">
        <thead><tr><th style="width:34%">Recipe</th><th>Contains</th></tr></thead>
        <tbody>
          <tr v-for="r in filteredRecipeRows" :key="r.id">
            <td style="font-weight:600">{{ r.name }}</td>
            <td>
              <template v-if="r.allergens.length">
                <span v-for="a in r.allergens" :key="a" class="al-badge">{{ a }}</span>
              </template>
              <span v-else style="color:var(--text-dim); font-size:13px">No tagged allergens</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <div class="empty-state-title">{{ recipes.length ? 'Nothing matches' : 'No recipes yet' }}</div>
        <div class="empty-state-text">
          {{ recipes.length ? 'No recipes are free from all the allergens you picked.' : 'Add recipes and they\'ll show their combined allergens here.' }}
        </div>
      </div>
    </div>

    <!-- Tag ingredients -->
    <h2 class="al-h2" style="margin-top:26px">Tag ingredients</h2>
    <input v-model="search" class="form-input" placeholder="Search ingredients…" style="margin-bottom:12px; max-width:320px" />
    <div class="card" style="padding:0; overflow:hidden">
      <table class="table" v-if="ingredientRows.length">
        <thead><tr><th style="width:26%">Ingredient</th><th>Allergens (click to toggle)</th></tr></thead>
        <tbody>
          <tr v-for="ing in ingredientRows" :key="ing.id">
            <td style="font-weight:600">{{ ing.name }}</td>
            <td>
              <div class="al-chips">
                <button v-for="a in ALLERGENS" :key="a" class="al-chip"
                  :class="{ 'al-chip-on': ing.set.has(a) }" @click="toggle(ing, a)">{{ a }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <div class="empty-state-title">{{ search ? 'No matches' : 'No ingredients yet' }}</div>
        <div class="empty-state-text">Add ingredients first, then tag their allergens here.</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 Tag each ingredient with the allergens it contains (the
        <strong style="color:var(--text)">14 majors</strong> plus the US big-9 are covered). Every recipe then
        shows the <strong style="color:var(--text)">combined</strong> allergens of all its ingredients — so your
        menu labelling and “does this have nuts?” answers are always correct and never out of date.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'
import { useRecipesStore } from '../stores/recipes'

// Major allergens — UK/EU 14 + US big-9 union, common kitchen set.
const ALLERGENS = [
  'Gluten', 'Dairy', 'Egg', 'Soy', 'Peanut', 'Tree nut', 'Fish', 'Shellfish',
  'Sesame', 'Celery', 'Mustard', 'Sulphites', 'Lupin', 'Molluscs',
]

const ingStore = useIngredientsStore()
const recStore = useRecipesStore()
const search = ref('')
const freeFrom = ref(new Set())

function toggleFree(a) {
  const s = new Set(freeFrom.value)
  s.has(a) ? s.delete(a) : s.add(a)
  freeFrom.value = s
}
const recipeAllergens = ref({}) // recipeId -> Set of allergen names

onMounted(async () => {
  await Promise.all([ingStore.fetchAll(), recStore.fetchAll()])
  await loadRecipeAllergens()
})

function parseSet(str) {
  return new Set((str || '').split(',').map((s) => s.trim()).filter(Boolean))
}

// Union the allergens of each recipe's ingredients.
async function loadRecipeAllergens() {
  const map = {}
  for (const r of recStore.recipes) {
    const lines = await recStore.getIngredients(r.id)
    const set = new Set()
    for (const l of lines) parseSet(l.allergens).forEach((a) => set.add(a))
    map[r.id] = set
  }
  recipeAllergens.value = map
}

const recipes = computed(() => recStore.recipes)

const recipeRows = computed(() =>
  recStore.recipes.map((r) => {
    const set = recipeAllergens.value[r.id] || new Set()
    // Keep canonical order, then any custom ones.
    const ordered = ALLERGENS.filter((a) => set.has(a))
    return { id: r.id, name: r.name, allergens: ordered }
  })
)

// "Free from" filter: keep only recipes that contain NONE of the picked allergens.
const filteredRecipeRows = computed(() =>
  freeFrom.value.size === 0
    ? recipeRows.value
    : recipeRows.value.filter((r) => !r.allergens.some((a) => freeFrom.value.has(a)))
)

const ingredientRows = computed(() => {
  let list = ingStore.ingredients
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((i) => i.name.toLowerCase().includes(q))
  }
  return list.map((i) => ({ ...i, set: parseSet(i.allergens) }))
})

async function toggle(ing, allergen) {
  const set = parseSet(ing.allergens)
  if (set.has(allergen)) set.delete(allergen)
  else set.add(allergen)
  // Persist in canonical order.
  const ordered = ALLERGENS.filter((a) => set.has(a))
  await ingStore.setAllergens(ing.id, ordered)
  await loadRecipeAllergens()
}
</script>

<style scoped>
.al-h2 { font-size: 15px; font-weight: 700; margin: 0 0 12px; color: var(--text); }
.al-badge {
  display: inline-block; padding: 3px 9px; margin: 2px 4px 2px 0; border-radius: 999px;
  background: rgba(248, 113, 113, 0.14); color: #fca5a5; font-size: 12px; font-weight: 600;
}
.al-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.al-chip {
  padding: 3px 10px; border-radius: 999px; font-size: 12px; cursor: pointer;
  background: transparent; color: var(--text-dim);
  border: 1px solid var(--border); transition: all 0.12s;
}
.al-chip:hover { border-color: var(--text-dim); color: var(--text); }
.al-chip-on {
  background: rgba(248, 113, 113, 0.16); color: #fca5a5; border-color: rgba(248, 113, 113, 0.4);
}
</style>
