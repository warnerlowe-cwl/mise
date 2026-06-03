<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Recipes</h1>
        <p class="page-subtitle">Build and cost your recipes from ingredients</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">+ Add Recipe</button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input
        v-model="search"
        class="form-input"
        placeholder="Search recipes..."
        style="max-width: 320px"
      />
    </div>

    <!-- Table -->
    <div class="card" style="margin-top: 16px; padding: 0; overflow: hidden">
      <table class="table" v-if="filtered.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Servings</th>
            <th>Total Cost</th>
            <th>Cost / Serving</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id">
            <td style="color: var(--text); font-weight: 500">{{ r.name }}</td>
            <td>
              <span v-if="r.category" class="badge badge-amber">{{ r.category }}</span>
              <span v-else style="color: var(--text-muted)">—</span>
            </td>
            <td>{{ r.servings }}</td>
            <td style="color: var(--green); font-weight: 600">${{ Number(r.total_cost).toFixed(2) }}</td>
            <td style="color: var(--text-dim)">${{ costPerServing(r) }}</td>
            <td>
              <div style="display: flex; gap: 6px; justify-content: flex-end">
                <button class="btn btn-ghost" style="padding: 5px 10px" @click="openEdit(r)">Edit</button>
                <button class="btn btn-danger" style="padding: 5px 10px" @click="confirmDelete(r)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <svg class="empty-state-icon" width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 2h8l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/>
          <path d="M13 2v4h4M7 9h6M7 12.5h4"/>
        </svg>
        <div class="empty-state-title">No recipes yet</div>
        <div class="empty-state-text">Add your first recipe to start costing your menu</div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal" style="width: 600px; max-height: 90vh; overflow-y: auto">
        <h2 class="modal-title">{{ editingId ? 'Edit Recipe' : 'Add Recipe' }}</h2>

        <!-- Basic Info -->
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input v-model="form.name" class="form-input" placeholder="e.g. Chicken Alfredo" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <input v-model="form.category" class="form-input" placeholder="e.g. Entree" />
          </div>
          <div class="form-group">
            <label class="form-label">Servings *</label>
            <input v-model="form.servings" class="form-input" type="number" min="1" placeholder="1" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes</label>
          <input v-model="form.notes" class="form-input" placeholder="Optional notes" />
        </div>

        <!-- Ingredients Section -->
        <div style="margin-top: 8px; margin-bottom: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px">
            <label class="form-label" style="margin: 0">Ingredients</label>
            <button class="btn btn-ghost" style="padding: 4px 10px; font-size: 12px" @click="addLine">+ Add</button>
          </div>

          <div v-if="!lines.length" style="color: var(--text-muted); font-size: 13px; padding: 12px; background: var(--surface-2); border-radius: 6px; text-align: center">
            No ingredients added yet
          </div>

          <div v-for="(line, idx) in lines" :key="idx" style="display: grid; grid-template-columns: 1fr 90px 90px auto; gap: 8px; margin-bottom: 8px; align-items: center">
            <select v-model="line.ingredient_id" class="form-select" @change="syncUnit(line)">
              <option value="">Select ingredient</option>
              <option v-for="ing in ingredientsStore.ingredients" :key="ing.id" :value="ing.id">
                {{ ing.name }} ({{ ing.unit }})
              </option>
            </select>
            <input v-model="line.quantity" class="form-input" type="number" step="0.01" min="0" placeholder="Qty" />
            <select v-model="line.unit" class="form-select">
              <optgroup label="Weight">
                <option>lb</option><option>oz</option><option>kg</option><option>g</option>
              </optgroup>
              <optgroup label="Volume">
                <option>gal</option><option>qt</option><option>pt</option><option>cup</option>
                <option>fl oz</option><option>tbsp</option><option>tsp</option>
              </optgroup>
              <optgroup label="Count">
                <option>each</option><option>dozen</option><option>case</option>
                <option>bag</option><option>can</option><option>bottle</option>
              </optgroup>
            </select>
            <button class="btn btn-danger" style="padding: 5px 10px" @click="removeLine(idx)">✕</button>
          </div>

          <!-- Live cost preview -->
          <div v-if="lines.length" style="margin-top: 12px; padding: 12px; background: var(--surface-2); border-radius: 6px; display: flex; justify-content: space-between">
            <span style="color: var(--text-dim); font-size: 13px">Estimated Total Cost</span>
            <span style="color: var(--green); font-weight: 700">${{ estimatedCost }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="!isValid">
            {{ editingId ? 'Save Changes' : 'Add Recipe' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal" style="width: 380px">
        <h2 class="modal-title">Delete Recipe?</h2>
        <p style="color: var(--text-dim); font-size: 14px">
          Are you sure you want to delete <strong style="color: var(--text)">{{ deleteTarget.name }}</strong>?
          This cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" @click="doDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'
import { useIngredientsStore } from '../stores/ingredients'

const store = useRecipesStore()
const ingredientsStore = useIngredientsStore()

const search = ref('')
const showModal = ref(false)
const editingId = ref(null)
const deleteTarget = ref(null)

const form = ref({ name: '', category: '', servings: 1, notes: '' })
const lines = ref([])

const filtered = computed(() => {
  if (!search.value) return store.recipes
  const q = search.value.toLowerCase()
  return store.recipes.filter(r =>
    r.name.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q)
  )
})

const isValid = computed(() => form.value.name.trim() && Number(form.value.servings) >= 1)

const estimatedCost = computed(() => {
  let total = 0
  for (const line of lines.value) {
    const ing = ingredientsStore.ingredients.find(i => i.id === Number(line.ingredient_id))
    if (ing && line.quantity) total += Number(line.quantity) * Number(ing.cost_per_unit)
  }
  return total.toFixed(2)
})

onMounted(async () => {
  await Promise.all([store.fetchAll(), ingredientsStore.fetchAll()])
})

function costPerServing(r) {
  return (Number(r.total_cost) / (r.servings || 1)).toFixed(2)
}

function addLine() {
  lines.value.push({ ingredient_id: '', quantity: '', unit: 'each' })
}

function removeLine(idx) {
  lines.value.splice(idx, 1)
}

function syncUnit(line) {
  const ing = ingredientsStore.ingredients.find(i => i.id === Number(line.ingredient_id))
  if (ing) line.unit = ing.unit
}

function openAdd() {
  editingId.value = null
  form.value = { name: '', category: '', servings: 1, notes: '' }
  lines.value = []
  showModal.value = true
}

async function openEdit(r) {
  editingId.value = r.id
  form.value = { name: r.name, category: r.category || '', servings: r.servings, notes: r.notes || '' }
  const ings = await store.getIngredients(r.id)
  lines.value = ings.map(i => ({ ingredient_id: i.ingredient_id, quantity: i.quantity, unit: i.unit }))
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  lines.value = []
}

async function save() {
  if (!isValid.value) return
  const validLines = lines.value.filter(l => l.ingredient_id && l.quantity)
  if (editingId.value) {
    await store.update(editingId.value, form.value, validLines)
  } else {
    await store.add(form.value, validLines)
  }
  closeModal()
}

function confirmDelete(r) {
  deleteTarget.value = r
}

async function doDelete() {
  await store.remove(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>
