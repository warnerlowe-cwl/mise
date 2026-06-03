<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Waste Tracker</h1>
        <p class="page-subtitle">Log spoilage and waste to track true food costs</p>
      </div>
      <button class="btn btn-primary" @click="showModal = true">+ Log Waste</button>
    </div>

    <!-- Summary Chips -->
    <div class="waste-stats">
      <div class="stat-card waste-stat">
        <div class="stat-label">This Week</div>
        <div class="stat-value stat-value-sm stat-value-red">${{ wasteStore.weeklyWasteCost.toFixed(2) }}</div>
      </div>
      <div class="stat-card waste-stat">
        <div class="stat-label">All Time</div>
        <div class="stat-value stat-value-sm stat-value-red">${{ wasteStore.totalWasteCost.toFixed(2) }}</div>
      </div>
      <div class="stat-card waste-stat">
        <div class="stat-label">Total Entries</div>
        <div class="stat-value stat-value-sm">{{ wasteStore.entries.length }}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="padding: 0; overflow: hidden">
      <table class="table" v-if="wasteStore.entries.length">
        <thead>
          <tr>
            <th>Date</th>
            <th>Ingredient</th>
            <th>Quantity</th>
            <th>Cost</th>
            <th>Reason</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in wasteStore.entries" :key="e.id">
            <td style="color: var(--text-muted); font-size: 12px">{{ formatDate(e.logged_at) }}</td>
            <td style="color: var(--text); font-weight: 500">{{ e.ingredient_name }}</td>
            <td>{{ e.quantity }} {{ e.unit }}</td>
            <td style="color: var(--red); font-weight: 600">${{ Number(e.waste_cost).toFixed(2) }}</td>
            <td style="color: var(--text-muted)">{{ e.reason || '—' }}</td>
            <td>
              <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px" @click="confirmDelete(e)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <svg class="empty-state-icon" width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.5 6h13M8.5 6V4.5h3V6M5.5 6l.7 10a1 1 0 001 .9h5.6a1 1 0 001-.9L14.5 6M8.5 9.5v4M11.5 9.5v4"/>
        </svg>
        <div class="empty-state-title">No waste logged</div>
        <div class="empty-state-text">Log spoilage and over-prep to understand your true food cost</div>
      </div>
    </div>

    <!-- Log Waste Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">Log Waste</h2>

        <div class="form-group">
          <label class="form-label">Ingredient *</label>
          <select v-model="form.ingredient_id" class="form-select" @change="syncUnit">
            <option value="">Select ingredient</option>
            <option v-for="ing in ingredientsStore.ingredients" :key="ing.id" :value="ing.id">
              {{ ing.name }} — ${{ Number(ing.cost_per_unit).toFixed(2) }}/{{ ing.unit }}
            </option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
          <div class="form-group">
            <label class="form-label">Quantity *</label>
            <input v-model="form.quantity" class="form-input" type="number" step="0.01" min="0" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label class="form-label">Unit *</label>
            <select v-model="form.unit" class="form-select">
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
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Reason</label>
          <input v-model="form.reason" class="form-input" placeholder="e.g. Expired, Over-prepped, Dropped" />
        </div>

        <!-- Cost preview -->
        <div v-if="estimatedCost !== null" style="padding: 12px; background: var(--surface-2); border-radius: 6px; display: flex; justify-content: space-between; margin-bottom: 4px">
          <span style="color: var(--text-dim); font-size: 13px">Estimated Waste Cost</span>
          <span style="color: var(--red); font-weight: 700">${{ estimatedCost }}</span>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="!isValid">Log Waste</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal" style="width: 380px">
        <h2 class="modal-title">Remove Entry?</h2>
        <p style="color: var(--text-dim); font-size: 14px">
          Remove this waste entry for <strong style="color: var(--text)">{{ deleteTarget.ingredient_name }}</strong>?
        </p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" @click="doDelete">Remove</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWasteStore } from '../stores/waste'
import { useIngredientsStore } from '../stores/ingredients'

const wasteStore = useWasteStore()
const ingredientsStore = useIngredientsStore()

const showModal = ref(false)
const deleteTarget = ref(null)
const form = ref({ ingredient_id: '', quantity: '', unit: 'each', reason: '' })

const isValid = computed(() => form.value.ingredient_id && form.value.quantity && form.value.unit)

const estimatedCost = computed(() => {
  if (!form.value.ingredient_id || !form.value.quantity) return null
  const ing = ingredientsStore.ingredients.find(i => i.id === Number(form.value.ingredient_id))
  if (!ing) return null
  return (Number(form.value.quantity) * Number(ing.cost_per_unit)).toFixed(2)
})

onMounted(async () => {
  await Promise.all([wasteStore.fetchAll(), ingredientsStore.fetchAll()])
})

function syncUnit() {
  const ing = ingredientsStore.ingredients.find(i => i.id === Number(form.value.ingredient_id))
  if (ing) form.value.unit = ing.unit
}

function closeModal() {
  showModal.value = false
  form.value = { ingredient_id: '', quantity: '', unit: 'each', reason: '' }
}

async function save() {
  if (!isValid.value) return
  await wasteStore.add(form.value)
  closeModal()
}

function confirmDelete(e) {
  deleteTarget.value = e
}

async function doDelete() {
  await wasteStore.remove(deleteTarget.value.id)
  deleteTarget.value = null
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.waste-stats { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.waste-stat { padding: 14px 20px !important; flex: 1; min-width: 140px; }
</style>
