<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Ingredients</h1>
        <p class="page-subtitle">Manage your ingredient list and unit costs</p>
      </div>
      <div style="display:flex; gap:8px">
        <button class="btn btn-ghost" @click="openLibrary">📚 From library</button>
        <button class="btn btn-ghost" @click="openImport">⬆ Import CSV</button>
        <button class="btn btn-primary" @click="openAdd">+ Add Ingredient</button>
      </div>
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
                <option>L</option>
                <option>ml</option>
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

        <!-- Pack sizing: buy by the bag/bottle/sleeve, use by the g/ml/each -->
        <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:14px">
          <div style="font-weight:600; font-size:13px; margin-bottom:4px">
            How you buy it <span style="color:var(--text-dim); font-weight:400">— optional, fills in the cost for you</span>
          </div>
          <div style="color:var(--text-dim); font-size:12px; margin-bottom:10px">
            e.g. a 1&nbsp;kg bag of beans you use by the gram, or a 750&nbsp;ml bottle you pour by the ml.
          </div>
          <div style="display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:12px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Pack</label>
              <input v-model="form.pack_label" class="form-input" placeholder="e.g. 1kg bag" />
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Pack price ($)</label>
              <input v-model="form.pack_price" class="form-input" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Pack size{{ form.unit ? ' (' + form.unit + ')' : '' }}</label>
              <input v-model="form.pack_size" class="form-input" type="number" step="any" min="0" placeholder="0" />
            </div>
          </div>
          <div v-if="packDerivedCost != null" style="margin-top:10px; font-size:13px; color:var(--green)">
            = <strong>${{ packDerivedCost.toFixed(4) }}</strong> per {{ form.unit || 'unit' }} — filled into Cost per Unit above
          </div>
          <div style="margin-top:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap">
            <label class="form-label" style="margin:0">Usable yield %</label>
            <input v-model="form.yield_pct" class="form-input" type="number" min="1" max="100" step="1" placeholder="100" style="width:90px" />
            <span style="color:var(--text-dim); font-size:12px">
              trim/loss — e.g. 80% if you toss 20%.
              <template v-if="effectiveCost != null">True cost <strong style="color:var(--text)">${{ effectiveCost.toFixed(2) }}</strong>/{{ form.unit || 'unit' }}</template>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Supplier</label>
          <input v-model="form.supplier" class="form-input" list="supplier-suggestions" placeholder="e.g. Sysco, US Foods" />
          <datalist id="supplier-suggestions">
            <option v-for="s in supplierSuggestions" :key="s" :value="s" />
          </datalist>
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

    <!-- Starter library -->
    <div class="modal-overlay" v-if="showLibrary" @click.self="showLibrary = false">
      <div class="modal" style="width: 620px; max-height: 86vh; display:flex; flex-direction:column">
        <h2 class="modal-title">Add from library</h2>
        <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 12px">
          Tap the items you stock — they're added with a sensible unit and a $0 cost you fill in later
          (or use “How you buy it” to price them). Skips anything you already have.
        </p>
        <div style="overflow:auto; flex:1; padding-right:4px">
          <div v-for="group in library" :key="group.category" style="margin-bottom:16px">
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-dim); margin-bottom:8px">{{ group.category }}</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px">
              <button
                v-for="it in group.items" :key="it.name"
                class="lib-chip"
                :class="{ 'lib-chip-on': picked.has(it.name), 'lib-chip-have': existingNames.has(it.name.toLowerCase()) }"
                :disabled="existingNames.has(it.name.toLowerCase())"
                @click="togglePick(it)"
              >
                {{ it.name }} <span class="lib-unit">{{ it.unit }}</span>
                <span v-if="existingNames.has(it.name.toLowerCase())" class="lib-have-tag">have</span>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showLibrary = false">Cancel</button>
          <button class="btn btn-primary" :disabled="!picked.size || addingLib" @click="addFromLibrary">
            {{ addingLib ? 'Adding…' : (picked.size ? `Add ${picked.size} ingredient${picked.size === 1 ? '' : 's'}` : 'Select items') }}
          </button>
        </div>
      </div>
    </div>

    <!-- CSV Import -->
    <div class="modal-overlay" v-if="showImport" @click.self="closeImport">
      <div class="modal" style="width: 560px">
        <h2 class="modal-title">Import Ingredients from a Spreadsheet</h2>
        <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 16px">
          Upload a CSV with columns <strong style="color: var(--text)">name, unit, cost_per_unit, supplier, notes</strong>.
          New to this? <a href="#" @click.prevent="downloadTemplate" style="color: var(--amber)">Download a template</a> to fill in.
        </p>

        <!-- drop zone -->
        <div
          class="import-drop"
          :class="{ 'import-drop-active': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @click="fileInput && fileInput.click()"
        >
          <input ref="fileInput" type="file" accept=".csv,text/csv" style="display:none" @change="onFile" />
          <div v-if="!parsed">
            <div style="font-size: 28px; margin-bottom: 6px">📄</div>
            <div style="color: var(--text)">Drop your CSV here, or click to choose a file</div>
            <div style="color: var(--text-dim); font-size: 12px; margin-top: 4px">.csv from Excel or Google Sheets</div>
          </div>
          <div v-else>
            <div style="color: var(--text)"><strong>{{ fileName }}</strong></div>
            <div style="color: var(--text-dim); font-size: 12px; margin-top: 4px">{{ parsed.valid.length }} ready · {{ parsed.errors.length }} skipped</div>
          </div>
        </div>

        <!-- preview -->
        <div v-if="parsed && parsed.valid.length" style="margin-top: 14px; max-height: 200px; overflow: auto">
          <table class="table">
            <thead><tr><th>Name</th><th>Unit</th><th>Cost</th><th>Supplier</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in parsed.valid.slice(0, 50)" :key="i">
                <td>{{ r.name }}</td>
                <td><span class="badge badge-amber">{{ r.unit }}</span></td>
                <td>${{ Number(r.cost_per_unit).toFixed(2) }}</td>
                <td style="color: var(--text-dim)">{{ r.supplier || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="parsed.valid.length > 50" style="color: var(--text-dim); font-size: 12px; padding: 6px">…and {{ parsed.valid.length - 50 }} more</div>
        </div>

        <!-- skipped rows -->
        <div v-if="parsed && parsed.errors.length" style="margin-top: 12px; background: rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.25); border-radius:8px; padding:10px; font-size:12px; color:#fca5a5; max-height:110px; overflow:auto">
          <strong>{{ parsed.errors.length }} row(s) skipped:</strong>
          <div v-for="(e, i) in parsed.errors.slice(0, 20)" :key="i">{{ e }}</div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closeImport">Cancel</button>
          <button class="btn btn-primary" @click="runImport" :disabled="!parsed || !parsed.valid.length || importing">
            {{ importing ? 'Importing…' : (parsed && parsed.valid.length ? `Import ${parsed.valid.length} ingredient${parsed.valid.length === 1 ? '' : 's'}` : 'Import') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'
import { getRegion, suppliersForRegion } from '../data/suppliers'
import { INGREDIENT_LIBRARY } from '../data/ingredient_library'

const store = useIngredientsStore()

// ── Starter library ────────────────────────────────────────
const library = INGREDIENT_LIBRARY
const showLibrary = ref(false)
const picked = ref(new Set())
const addingLib = ref(false)

const existingNames = computed(() => new Set(store.ingredients.map((i) => i.name.trim().toLowerCase())))

function openLibrary() {
  picked.value = new Set()
  showLibrary.value = true
}
function togglePick(it) {
  const s = new Set(picked.value)
  s.has(it.name) ? s.delete(it.name) : s.add(it.name)
  picked.value = s
}
async function addFromLibrary() {
  const rows = []
  for (const g of library) {
    for (const it of g.items) {
      if (picked.value.has(it.name) && !existingNames.value.has(it.name.toLowerCase())) {
        rows.push({ name: it.name, unit: it.unit, cost_per_unit: 0 })
      }
    }
  }
  if (!rows.length) { showLibrary.value = false; return }
  addingLib.value = true
  try {
    await store.addMany(rows)
    showLibrary.value = false
  } finally {
    addingLib.value = false
  }
}

// Realistic suppliers for the user's region + any they've already used.
const supplierSuggestions = computed(() => {
  const used = store.ingredients.map((i) => i.supplier).filter(Boolean)
  return [...new Set([...used, ...suppliersForRegion(getRegion())])]
})
const search = ref('')
const showModal = ref(false)
const editingId = ref(null)
const deleteTarget = ref(null)

const emptyForm = () => ({ name: '', unit: '', cost_per_unit: '', supplier: '', notes: '', pack_label: '', pack_price: '', pack_size: '', yield_pct: '' })
const form = ref(emptyForm())

// Cost after trim/loss: cost ÷ (yield% / 100). Shown when yield is below 100.
const effectiveCost = computed(() => {
  const c = Number(form.value.cost_per_unit)
  const y = Number(form.value.yield_pct)
  if (!(c > 0) || !(y > 0) || y >= 100) return null
  return c / (y / 100)
})

// Derive cost-per-unit from a pack: pack price ÷ how many usage-units are in the pack.
const packDerivedCost = computed(() => {
  const p = Number(form.value.pack_price)
  const s = Number(form.value.pack_size)
  return p > 0 && s > 0 ? p / s : null
})
// When the pack is filled in, auto-fill the cost field (kept to 4dp for small per-unit costs).
watch(packDerivedCost, (v) => {
  if (v != null) form.value.cost_per_unit = Math.round((v + Number.EPSILON) * 10000) / 10000
})

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
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.value = {
    name: item.name, unit: item.unit, cost_per_unit: item.cost_per_unit,
    supplier: item.supplier || '', notes: item.notes || '',
    pack_label: item.pack_label || '', pack_price: item.pack_price ?? '', pack_size: item.pack_size ?? '',
    yield_pct: item.yield_pct ?? '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function save() {
  if (!isValid.value) return
  const numOrNull = (v) => (v === '' || v == null ? null : Number(v))
  const payload = {
    ...form.value,
    pack_price: numOrNull(form.value.pack_price),
    pack_size: numOrNull(form.value.pack_size),
    pack_label: (form.value.pack_label || '').trim() || null,
    yield_pct: numOrNull(form.value.yield_pct),
  }
  if (editingId.value) {
    await store.update(editingId.value, payload)
  } else {
    await store.add(payload)
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

// ── CSV import ──────────────────────────────────────────────
const showImport = ref(false)
const parsed = ref(null)
const fileName = ref('')
const dragOver = ref(false)
const importing = ref(false)
const fileInput = ref(null)

function openImport() {
  parsed.value = null
  fileName.value = ''
  dragOver.value = false
  showImport.value = true
}
function closeImport() {
  showImport.value = false
}

function onFile(e) {
  const f = e.target.files && e.target.files[0]
  if (f) readFile(f)
}
function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer.files && e.dataTransfer.files[0]
  if (f) readFile(f)
}
function readFile(f) {
  fileName.value = f.name
  const reader = new FileReader()
  reader.onload = () => { parsed.value = processCSV(String(reader.result || '')) }
  reader.readAsText(f)
}

// RFC-4180-ish CSV parser (handles quotes, commas inside quotes, CRLF)
function parseCSV(text) {
  const rows = []
  let cur = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else {
      if (c === '"') q = true
      else if (c === ',') { cur.push(field); field = '' }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = '' }
      else if (c !== '\r') field += c
    }
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur) }
  return rows.filter(r => r.some(x => x.trim() !== ''))
}

function processCSV(text) {
  const rows = parseCSV(text)
  if (!rows.length) return { valid: [], errors: ['The file looks empty.'] }
  const header = rows[0].map(h => h.trim().toLowerCase())
  const find = re => header.findIndex(h => re.test(h))
  const idx = {
    name: find(/name|ingredient|item/),
    unit: find(/unit|measure/),
    cost: find(/cost|price|\$/),
    supplier: find(/supplier|vendor/),
    notes: find(/note/),
  }
  const hasHeader = idx.name >= 0 || idx.cost >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows
  const valid = [], errors = []
  dataRows.forEach((r, n) => {
    const cell = (key, pos) => ((hasHeader && idx[key] >= 0 ? r[idx[key]] : (hasHeader ? '' : r[pos])) || '').trim()
    const name = cell('name', 0)
    const rawCost = (hasHeader ? (idx.cost >= 0 ? r[idx.cost] : '') : r[2]) || ''
    const cost = parseFloat(String(rawCost).replace(/[$,\s]/g, ''))
    if (!name) { errors.push(`Row ${n + 1}: no name`); return }
    if (isNaN(cost)) { errors.push(`Row ${n + 1} (${name}): cost "${String(rawCost).trim()}" isn't a number`); return }
    valid.push({
      name,
      unit: cell('unit', 1).toLowerCase() || 'each',
      cost_per_unit: cost,
      supplier: cell('supplier', 3),
      notes: cell('notes', 4),
    })
  })
  return { valid, errors }
}

function downloadTemplate() {
  const csv =
    'name,unit,cost_per_unit,supplier,notes\n' +
    'Chicken Breast,lb,3.49,Sysco,Boneless skinless\n' +
    'Olive Oil,fl oz,0.42,US Foods,Extra virgin\n' +
    'All-Purpose Flour,lb,0.65,,\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mise-ingredients-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function runImport() {
  if (!parsed.value || !parsed.value.valid.length) return
  importing.value = true
  try {
    await store.addMany(parsed.value.valid)
    closeImport()
  } catch (e) {
    alert('Import failed: ' + (e.message || e))
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.import-drop {
  border: 2px dashed var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 12px;
  padding: 28px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.import-drop:hover,
.import-drop-active {
  border-color: var(--amber, #fbbf24);
  background: rgba(251, 191, 36, 0.06);
}

.lib-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 999px; font-size: 13px; cursor: pointer;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border); transition: all 0.12s;
}
.lib-chip:hover { border-color: var(--text-dim); }
.lib-chip-on { background: rgba(245,158,11,0.16); color: var(--accent); border-color: rgba(245,158,11,0.45); }
.lib-chip-have { opacity: 0.5; cursor: default; }
.lib-unit { font-size: 11px; color: var(--text-dim); }
.lib-chip-on .lib-unit { color: var(--accent); }
.lib-have-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-left: 2px; }
</style>
