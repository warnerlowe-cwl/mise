<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Scan Invoice</h1>
        <p class="page-subtitle">Photograph or open a supplier invoice and update your prices in one go</p>
      </div>
      <button v-if="step !== 'pick'" class="btn btn-ghost" @click="reset">Scan another</button>
    </div>

    <!-- 1. Pick a file -->
    <div v-if="step === 'pick'" class="card" style="margin-top:16px">
      <label class="form-label">Supplier (optional, helps MenuCents remember this supplier's items)</label>
      <input v-model="supplier" list="scan-suppliers" class="form-input" placeholder="e.g. your produce supplier" style="max-width:360px" />
      <datalist id="scan-suppliers"><option v-for="s in supplierSuggestions" :key="s" :value="s" /></datalist>

      <div class="scan-drop" :class="{ over: dragOver }" @dragover.prevent="dragOver = true" @dragleave="dragOver = false"
        @drop.prevent="onDrop" @click="fileInput.click()">
        <div class="scan-drop-icon">🧾</div>
        <div class="scan-drop-title">Drop an invoice here, or click to choose one</div>
        <div class="scan-drop-sub">A photo (JPG or PNG) or a PDF. It's read on this computer and never uploaded.</div>
      </div>
      <input ref="fileInput" type="file" accept="image/*,.pdf,application/pdf" style="display:none" @change="onPick" />
      <p v-if="error" class="scan-err">{{ error }}</p>
      <p class="scan-tip">For photos: lay the invoice flat, in good light, with the whole page in the picture.</p>
    </div>

    <!-- 2. Reading -->
    <div v-else-if="step === 'reading'" class="card" style="margin-top:16px; text-align:center; padding:40px">
      <div class="scan-drop-title">Reading {{ fileName }}…</div>
      <div class="scan-bar"><div :style="{ width: Math.round(progress * 100) + '%' }"></div></div>
      <div class="scan-drop-sub">The first scan takes a little longer while the reader starts up.</div>
    </div>

    <!-- 3. Check the lines -->
    <template v-else-if="step === 'review'">
      <div v-if="!rows.length" class="card" style="margin-top:16px; padding:32px; text-align:center; color:var(--text-dim)">
        No item lines with prices were found in {{ fileName }}. Try a sharper photo with the whole page in view, or the PDF
        if your supplier emails one.
      </div>
      <template v-else>
        <div class="card scan-summary">
          <div><strong>{{ rows.length }}</strong> lines found · <strong>{{ matchedCount }}</strong> matched to your ingredients</div>
          <div class="scan-drop-sub">Check each price before updating. Lines marked <span class="scan-warn">check</span> changed a lot or don't add up, which usually means a number was misread. They start unticked.</div>
        </div>

        <div class="card" style="margin-top:12px; padding:0; overflow-x:auto">
          <table class="table scan-table">
            <thead>
              <tr>
                <th style="width:34px"></th>
                <th>Invoice line</th>
                <th>Your ingredient</th>
                <th>Pack price</th>
                <th>Pack size</th>
                <th>New cost</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.i" :class="{ 'scan-off': !r.use }">
                <td><input type="checkbox" v-model="r.use" :disabled="!r.ingredient_id || !(costOf(r) > 0)" /></td>
                <td>
                  <div class="scan-desc">{{ r.desc }}</div>
                  <div class="scan-raw" :title="r.raw">{{ r.raw }}</div>
                </td>
                <td>
                  <select v-model="r.ingredient_id" class="form-input scan-select" @change="onChoose(r)">
                    <option :value="null">Skip this line</option>
                    <option v-for="ing in sortedIngredients" :key="ing.id" :value="ing.id">{{ ing.name }}</option>
                  </select>
                  <div v-if="r.remembered" class="scan-raw">remembered from a past invoice</div>
                </td>
                <td><input v-model.number="r.price" type="number" step="0.01" min="0" class="form-input scan-num" /></td>
                <td>
                  <div v-if="ingOf(r)" style="display:flex; align-items:center; gap:6px">
                    <input v-model.number="r.pack_size" type="number" step="any" min="0" class="form-input scan-num" />
                    <span class="scan-raw" style="white-space:nowrap">{{ ingOf(r).unit }}</span>
                  </div>
                </td>
                <td class="scan-money">
                  <template v-if="ingOf(r) && costOf(r) > 0">{{ cur }}{{ costOf(r).toFixed(costOf(r) < 1 ? 3 : 2) }}<span class="scan-raw">/{{ ingOf(r).unit }}</span></template>
                </td>
                <td>
                  <template v-if="ingOf(r) && changeOf(r) !== null">
                    <span class="scan-chg" :class="changeOf(r) > 0.001 ? 'up' : changeOf(r) < -0.001 ? 'down' : ''">
                      {{ changeOf(r) > 0 ? '+' : '' }}{{ (changeOf(r) * 100).toFixed(0) }}%
                    </span>
                    <span v-if="r.doubt || Math.abs(changeOf(r)) > 0.5" class="scan-warn" :title="r.doubt ? 'Quantity x price does not match the line total' : 'Big change: check the price'">check</span>
                    <div class="scan-raw">was {{ cur }}{{ Number(ingOf(r).cost_per_unit).toFixed(Number(ingOf(r).cost_per_unit) < 1 ? 3 : 2) }}</div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex; gap:10px; margin-top:14px; align-items:center; flex-wrap:wrap">
          <button class="btn btn-primary" :disabled="!chosen.length || saving" @click="apply">
            {{ saving ? 'Updating…' : `Update ${chosen.length} price${chosen.length === 1 ? '' : 's'}` }}
          </button>
          <span class="scan-drop-sub">Pack size is how many of your ingredient's unit one pack holds (a 25 lb sack of a kg ingredient is 11.34).</span>
        </div>
      </template>
    </template>

    <!-- 4. Done -->
    <div v-else class="card" style="margin-top:16px; padding:28px">
      <div class="scan-drop-title">✓ {{ done.count }} price{{ done.count === 1 ? '' : 's' }} updated</div>
      <p class="scan-drop-sub" style="margin:8px 0 0">
        <template v-if="done.recipes">These ingredients are used in {{ done.recipes }} recipe{{ done.recipes === 1 ? '' : 's' }}; their costs have updated too.</template>
        MenuCents will recognise these items next time you scan an invoice{{ supplier ? ' from ' + supplier : '' }}.
      </p>
      <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap">
        <RouterLink to="/pricing" class="btn btn-primary">See menu pricing</RouterLink>
        <RouterLink to="/prices" class="btn btn-ghost">Price trends</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIngredientsStore } from '../stores/ingredients'
import { getRegion, suppliersForRegion } from '../data/suppliers'
import { readInvoice, parseLines, matchIngredient, packInUnit, lineKey } from '../lib/invoice'

const store = useIngredientsStore()
const step = ref('pick')
const supplier = ref('')
const fileInput = ref(null)
const fileName = ref('')
const progress = ref(0)
const error = ref('')
const dragOver = ref(false)
const rows = ref([])
const saving = ref(false)
const done = ref({ count: 0, recipes: 0 })

onMounted(() => store.fetchAll())

const supplierSuggestions = computed(() => {
  const used = store.ingredients.map((i) => i.supplier).filter(Boolean)
  return [...new Set([...used, ...suppliersForRegion(getRegion())])]
})
const sortedIngredients = computed(() => [...store.ingredients].sort((a, b) => a.name.localeCompare(b.name)))
const ingOf = (r) => store.ingredients.find((i) => i.id === r.ingredient_id)
const costOf = (r) => (Number(r.price) > 0 && Number(r.pack_size) > 0 ? Number(r.price) / Number(r.pack_size) : 0)
function changeOf(r) {
  const old = Number(ingOf(r)?.cost_per_unit)
  return old > 0 && costOf(r) > 0 ? costOf(r) / old - 1 : null
}
const matchedCount = computed(() => rows.value.filter((r) => r.ingredient_id).length)
const chosen = computed(() => rows.value.filter((r) => r.use && r.ingredient_id && costOf(r) > 0))

// Pack size in the ingredient's unit: a size confirmed on an earlier invoice, else the size printed on the
// line (converted, e.g. 25 lb into kg), else the pack size already saved on the ingredient, else 1.
function defaultPack(r, alias) {
  const ing = ingOf(r)
  if (!ing) return null
  if (alias && alias.ingredient_id === ing.id && alias.pack_size > 0) return alias.pack_size
  return packInUnit(r.pack, ing.unit) || (Number(ing.pack_size) > 0 ? Number(ing.pack_size) : 1)
}
function onChoose(r) {
  r.remembered = false
  r.pack_size = defaultPack(r)
  r.use = !!r.ingredient_id && changeOf(r) !== null && Math.abs(changeOf(r)) <= 0.5
}

function onPick(e) { const f = e.target.files?.[0]; e.target.value = ''; if (f) scan(f) }
function onDrop(e) { dragOver.value = false; const f = e.dataTransfer.files?.[0]; if (f) scan(f) }

async function scan(file) {
  error.value = ''
  if (!/^image\//.test(file.type) && !/pdf/i.test(file.type) && !/\.(pdf|jpe?g|png|webp|bmp|gif)$/i.test(file.name)) {
    error.value = 'That file type can\'t be read. Use a JPG, PNG or PDF.'
    return
  }
  fileName.value = file.name
  progress.value = 0
  step.value = 'reading'
  try {
    const lines = parseLines(await readInvoice(file, (p) => { progress.value = p }))
    const aliases = await store.loadInvoiceAliases(supplier.value.trim())
    rows.value = lines.map((l, i) => {
      const m = matchIngredient(l.desc, store.ingredients, aliases)
      const r = { ...l, i, line_key: lineKey(l.desc), ingredient_id: m ? m.id : null, remembered: !!m?.remembered, pack_size: null, use: false }
      r.pack_size = defaultPack(r, m?.remembered ? { ingredient_id: m.id, pack_size: m.pack_size } : null)
      const c = r.ingredient_id ? changeOf(r) : null
      r.use = c !== null && Math.abs(c) <= 0.5 && !r.doubt
      return r
    })
    step.value = 'review'
  } catch (e) {
    console.error(e)
    error.value = 'Could not read that invoice (' + (e?.message || e) + '). Try a clearer photo or the PDF.'
    step.value = 'pick'
  }
}

async function apply() {
  saving.value = true
  try {
    const lines = chosen.value.map((r) => ({
      ingredient_id: r.ingredient_id, line_key: r.line_key,
      cost_per_unit: Math.round(costOf(r) * 10000) / 10000,
      pack_price: Number(r.price), pack_size: Number(r.pack_size),
      pack_label: r.pack ? `${r.pack.amount} ${r.pack.unit}` : null,
    }))
    const ids = new Set(lines.map((l) => l.ingredient_id))
    const count = await store.applyInvoice(supplier.value.trim(), lines)
    done.value = { count, recipes: await store.recipesUsing([...ids]) }
    step.value = 'done'
  } finally {
    saving.value = false
  }
}

function reset() { rows.value = []; error.value = ''; step.value = 'pick' }
</script>

<style scoped>
.form-label { display:block; font-size:13px; color:var(--text-dim); margin-bottom:6px; }
.scan-drop { margin-top:16px; border:2px dashed var(--border); border-radius:var(--radius); padding:40px 20px; text-align:center; cursor:pointer; transition:border-color .15s, background .15s; }
.scan-drop:hover, .scan-drop.over { border-color:var(--accent); background:var(--surface-2); }
.scan-drop-icon { font-size:34px; }
.scan-drop-title { font-size:16px; font-weight:600; color:var(--text); margin-top:6px; }
.scan-drop-sub { font-size:13px; color:var(--text-dim); margin-top:4px; line-height:1.5; }
.scan-tip { font-size:12px; color:var(--text-dim); margin:12px 0 0; }
.scan-err { color:var(--red); font-size:13px; margin:12px 0 0; }
.scan-bar { height:8px; background:var(--surface-2); border-radius:4px; overflow:hidden; margin:16px auto 10px; max-width:420px; }
.scan-bar div { height:100%; background:var(--accent); transition:width .2s; }
.scan-summary { margin-top:16px; padding:14px 16px; display:flex; flex-direction:column; gap:4px; }
.scan-table td { vertical-align:top; }
.scan-desc { color:var(--text); font-weight:600; }
.scan-raw { font-size:11px; color:var(--text-dim); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.scan-select { min-width:170px; }
.scan-num { width:90px; }
.scan-money { font-variant-numeric:tabular-nums; white-space:nowrap; color:var(--text); }
.scan-chg { font-weight:700; font-variant-numeric:tabular-nums; }
.scan-chg.up { color:#f87171; } .scan-chg.down { color:#6ee7b7; }
.scan-warn { display:inline-block; margin-left:6px; font-size:11px; font-weight:700; color:#000; background:var(--accent); border-radius:999px; padding:1px 7px; }
.scan-off { opacity:.55; }
</style>
