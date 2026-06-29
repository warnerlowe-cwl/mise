<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Your profile and account</p>
      </div>
    </div>

    <div class="card" style="max-width: 540px">
      <div class="section-header">Profile</div>
      <div class="form-group">
        <label class="form-label">Business name</label>
        <input
          v-model="businessName"
          class="form-input"
          type="text"
          maxlength="80"
          placeholder="e.g. Isebel's Cafe"
          @keydown.enter="save"
        />
        <p class="settings-hint">Your bakery, cafe, or kitchen name — shown across Mise.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="text" :value="authStore.user?.email || ''" disabled />
      </div>
      <div class="form-group">
        <label class="form-label">Region</label>
        <select v-model="region" class="form-input" @change="saveRegion">
          <option v-for="r in REGIONS" :key="r.code" :value="r.code">{{ r.label }}</option>
        </select>
        <p class="settings-hint">Sets which real suppliers Mise suggests (Sysco, Brakes, etc.). You can always add your own.</p>
      </div>
      <div class="settings-actions">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
        <span class="settings-ok" v-if="saved">✓ Saved</span>
        <span class="settings-err" v-if="error">{{ error }}</span>
      </div>
    </div>

    <div class="card" style="max-width: 540px; margin-top: 16px">
      <div class="section-header">Backup &amp; data</div>
      <p class="settings-hint" style="margin: 0 0 14px">
        Your data lives on this computer. Export a backup regularly — and before reinstalling or
        switching machines — so you never lose your ingredients and recipes.
      </p>
      <div class="settings-actions" style="flex-wrap: wrap; gap: 10px">
        <button class="btn btn-primary" :disabled="busy" @click="exportBackup">⬇ Export backup (.json)</button>
        <button class="btn btn-ghost" :disabled="busy" @click="exportCsv">Export ingredients (.csv)</button>
        <button class="btn btn-ghost" :disabled="busy" @click="$refs.restoreInput.click()">↺ Restore from backup…</button>
        <button class="btn btn-ghost" :disabled="busy" @click="loadSample">✨ Load sample data</button>
        <input ref="restoreInput" type="file" accept="application/json,.json" style="display:none" @change="restoreBackup" />
      </div>
      <p class="settings-ok" v-if="dataMsg">{{ dataMsg }}</p>
      <p class="settings-err" v-if="dataErr">{{ dataErr }}</p>
    </div>

    <div class="card" style="max-width: 540px; margin-top: 16px">
      <div class="section-header">Account</div>
      <button class="btn btn-ghost" @click="authStore.signOut()">Sign out</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { exportAll, importAll, getDb, seedSampleData } from '../db/database'
import { REGIONS, getRegion, setRegion } from '../data/suppliers'
import { applyRegionCurrency } from '../currency'

const authStore = useAuthStore()
const businessName = ref('')
const region = ref(getRegion())
function saveRegion() {
  setRegion(region.value)
  applyRegionCurrency()
}
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const busy = ref(false)
const dataMsg = ref('')
const dataErr = ref('')

function download(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function exportBackup() {
  dataMsg.value = ''; dataErr.value = ''; busy.value = true
  try {
    const data = await exportAll()
    download(`mise-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json')
    dataMsg.value = '✓ Backup downloaded.'
  } catch (e) {
    dataErr.value = e?.message || 'Export failed'
  } finally {
    busy.value = false
  }
}

function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

async function exportCsv() {
  dataMsg.value = ''; dataErr.value = ''; busy.value = true
  try {
    const db = await getDb()
    const rows = await db.select('SELECT name, unit, cost_per_unit, supplier, notes FROM ingredients ORDER BY name')
    const header = ['name', 'unit', 'cost_per_unit', 'supplier', 'notes']
    const lines = [header.join(',')].concat(
      rows.map((r) => header.map((h) => csvCell(r[h])).join(','))
    )
    download(`mise-ingredients-${today()}.csv`, lines.join('\n'), 'text/csv')
    dataMsg.value = `✓ Exported ${rows.length} ingredients.`
  } catch (e) {
    dataErr.value = e?.message || 'CSV export failed'
  } finally {
    busy.value = false
  }
}

async function loadSample() {
  dataMsg.value = ''; dataErr.value = ''
  const db = await getDb()
  const [n] = await db.select('SELECT COUNT(*) AS c FROM ingredients')
  if (n.c > 0 && !confirm('This adds sample ingredients and recipes alongside your existing data. Continue?')) return
  busy.value = true
  try {
    const r = await seedSampleData()
    dataMsg.value = `✓ Added ${r.ingredients} ingredients and ${r.recipes} recipes. Reloading…`
    setTimeout(() => window.location.reload(), 800)
  } catch (e) {
    dataErr.value = e?.message || 'Could not load sample data'
    busy.value = false
  }
}

async function restoreBackup(ev) {
  dataMsg.value = ''; dataErr.value = ''
  const file = ev.target.files?.[0]
  ev.target.value = '' // allow re-selecting the same file later
  if (!file) return
  if (!confirm('Restore will REPLACE all current ingredients and recipes with the backup. Continue?')) return
  busy.value = true
  try {
    const payload = JSON.parse(await file.text())
    if (payload?.app !== 'mise' || !payload?.tables) throw new Error('Not a valid Mise backup file')
    const n = await importAll(payload)
    dataMsg.value = `✓ Restored ${n} records. Reloading…`
    setTimeout(() => window.location.reload(), 800)
  } catch (e) {
    dataErr.value = e?.message || 'Restore failed'
    busy.value = false
  }
}

onMounted(() => { businessName.value = authStore.businessName })

async function save() {
  error.value = ''
  saved.value = false
  saving.value = true
  try {
    await authStore.updateProfile({ businessName: businessName.value })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e) {
    error.value = e?.message || 'Could not save'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-hint { font-size: 12px; color: var(--text-muted); margin: 6px 0 0; }
.settings-actions { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.settings-ok { color: #16a34a; font-size: 13px; }
.settings-err { color: var(--red); font-size: 13px; }
</style>
