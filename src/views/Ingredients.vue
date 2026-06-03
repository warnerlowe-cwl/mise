<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Ingredients</h1>
        <p class="page-subtitle">Manage your ingredient list and unit costs</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">+ Add Ingredient</button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input
        v-model="search"
        class="form-input"
        placeholder="Search ingredients..."
        style="max-width: 320px"
      />
    </div>

    <!-- Table -->
    <div class="card" style="margin-top: 16px; padding: 0; overflow: hidden">
      <table class="table" v-if="filtered.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>Unit</th>
            <th>Cost / Unit</th>
            <th>Supplier</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td style="color: var(--text); font-weight: 500">{{ item.name }}</td>
            <td><span class="badge badge-amber">{{ item.unit }}</span></td>
            <td style="color: var(--green); font-weight: 600">${{ Number(item.cost_per_unit).toFixed(2) }}</td>
            <td>{{ item.supplier || '—' }}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ item.notes || '—' }}</td>
            <td>
              <div style="display: flex; gap: 6px; justify-content: flex-end">
                <button class="btn btn-ghost" style="padding: 5px 10px" @click="openEdit(item)">Edit</button>
                <button class="btn btn-danger" style="padding: 5px 10px" @click="confirmDelete(item)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" v-else>
        <svg class="empty-state-icon" width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.5H7a1 1 0 00-.7.3L2.8 6.3a1 1 0 000 1.4l9.5 9.5a1 1 0 001.4 0l4.5-4.5a1 1 0 000-1.4L13 2.8A1 1 0 0012 2.5z"/>
          <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
        </svg>
        <div class="empty-state-title">No ingredients yet</div>
        <div class="empty-state-text">Add your first ingredient to get started</div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">{{ editingId ? 'Edit Ingredient' : 'Add Ingredient' }}</h2>

        <div class="form-group">
          <label class="form-label">Name *</label>
          <input v-model="form.name" class="form-input" placeholder="e.g. Chicken Breast" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
          <div class="form-group">
            <label class="form-label">Unit *</label>
            <select v-model="form.unit" class="form-select">
              <option value="">Select unit</option>
              <optgroup label="Weight">
                <option>lb</option>
                <option>oz</option>
                <option>kg</option>
                <option>g</option>
              </optgroup>
              <optgroup label="Volume">
                <option>gal</option>
                <option>qt</option>
                <option>pt</option>
                <option>cup</option>
                <option>fl oz</option>
                <option>tbsp</option>
                <option>tsp</option>
              </optgroup>
              <optgroup label="Count">
                <option>each</option>
                <option>dozen</option>
                <option>case</option>
                <option>bag</option>
                <option>can</option>
                <option>bottle</option>
              </optgroup>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Cost per Unit ($) *</label>
            <input v-model="form.cost_per_unit" class="form-input" type="number" step="0.01" min="0" placeholder="0.00" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Supplier</label>
          <input v-model="form.supplier" class="form-input" placeholder="e.g. Sysco, US Foods" />
        </div>

        <div class="form-group">
          <label class="form-label">Notes</label>
          <input v-model="form.notes" class="form-input" placeholder="Optional notes" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="!isValid">
            {{ editingId ? 'Save Changes' : 'Add Ingredient' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal" style="width: 380px">
        <h2 class="modal-title">Delete Ingredient?</h2>
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
import { useIngredientsStore } from '../stores/ingredients'

const store = useIngredientsStore()
const search = ref('')
const showModal = ref(false)
const editingId = ref(null)
const deleteTarget = ref(null)

const form = ref({ name: '', unit: '', cost_per_unit: '', supplier: '', notes: '' })

const filtered = computed(() => {
  if (!search.value) return store.ingredients
  const q = search.value.toLowerCase()
  return store.ingredients.filter(i =>
    i.name.toLowerCase().includes(q) || (i.supplier || '').toLowerCase().includes(q)
  )
})

const isValid = computed(() =>
  form.value.name.trim() && form.value.unit && form.value.cost_per_unit !== ''
)

onMounted(() => store.fetchAll())

function openAdd() {
  editingId.value = null
  form.value = { name: '', unit: '', cost_per_unit: '', supplier: '', notes: '' }
  showModal.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.value = { name: item.name, unit: item.unit, cost_per_unit: item.cost_per_unit, supplier: item.supplier || '', notes: item.notes || '' }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function save() {
  if (!isValid.value) return
  if (editingId.value) {
    await store.update(editingId.value, form.value)
  } else {
    await store.add(form.value)
  }
  closeModal()
}

function confirmDelete(item) {
  deleteTarget.value = item
}

async function doDelete() {
  await store.remove(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>
