<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Plate Cost</h1>
        <p class="page-subtitle">True cost per dish — food <em>plus</em> labor, the cost food-cost % leaves out</p>
      </div>
    </div>

    <div class="card" style="padding:16px; margin-top:16px; display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap">
      <div>
        <label class="form-label">Labor rate ($/hour)</label>
        <input v-model.number="laborRate" type="number" min="0" step="any" class="form-input" style="width:140px" />
      </div>
      <p style="color:var(--text-dim); font-size:13px; margin:0 0 8px">
        Set your kitchen's blended hourly wage. Enter prep minutes per dish below to see the real plate cost.
      </p>
    </div>

    <div class="card" style="margin-top:16px; padding:0; overflow:hidden">
      <table class="table" v-if="rows.length">
        <thead>
          <tr>
            <th>Dish</th><th>Food / serv</th><th style="width:110px">Prep min</th>
            <th>Labor / serv</th><th>Plate cost</th><th>Price</th><th>True margin</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td style="font-weight:600">{{ r.name }}</td>
            <td style="color:var(--text-dim)">{{ cur }}{{ r.foodPerServing.toFixed(2) }}</td>
            <td>
              <input :value="r.prep ?? ''" @change="setPrep(r, $event.target.value)"
                type="number" min="0" step="any" class="form-input" placeholder="0" style="width:80px" />
            </td>
            <td style="color:var(--text-dim)">{{ cur }}{{ r.laborPerServing.toFixed(2) }}</td>
            <td style="font-weight:600">{{ cur }}{{ r.plateCost.toFixed(2) }}</td>
            <td>{{ r.price ? '$' + r.price.toFixed(2) : '—' }}</td>
            <td>
              <span v-if="r.price" :style="{ color: r.trueMargin >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight:600 }">
                {{ cur }}{{ r.trueMargin.toFixed(2) }}
                <span style="color:var(--text-dim); font-weight:400">({{ r.truePct.toFixed(0) }}%)</span>
              </span>
              <span v-else style="color:var(--text-dim); font-size:12px">set a price</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else style="padding:36px 0">
        <div class="empty-state-title">No recipes yet</div>
        <div class="empty-state-text">Add recipes to see their true plate cost.</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 A dish can look healthy at 28% food cost and still lose money once labor is counted.
        <strong style="color:var(--text)">Plate cost = food + labor per serving</strong>; true margin is your
        menu price minus that. The percentage shown is the true margin as a share of the price — watch for
        dishes that are <span style="color:#fca5a5">cheap to plate but slow and labor-heavy</span>.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'

const store = useRecipesStore()
const LS_KEY = 'mise_labor_rate'
const laborRate = ref(Number(localStorage.getItem(LS_KEY)) || 18)

onMounted(() => store.fetchAll())
watch(laborRate, (v) => localStorage.setItem(LS_KEY, String(Number(v) || 0)))

const rows = computed(() =>
  store.recipes.map((r) => {
    const servings = Number(r.servings) || 1
    const foodPerServing = (Number(r.total_cost) || 0) / servings
    const prep = r.prep_minutes
    const laborBatch = (Number(laborRate.value) || 0) / 60 * (Number(prep) || 0)
    const laborPerServing = laborBatch / servings
    const plateCost = foodPerServing + laborPerServing
    const price = r.menu_price != null ? Number(r.menu_price) : 0
    const trueMargin = price - plateCost
    const truePct = price ? (trueMargin / price) * 100 : 0
    return { id: r.id, name: r.name, foodPerServing, prep, laborPerServing, plateCost, price, trueMargin, truePct }
  })
)

async function setPrep(r, val) {
  const v = val === '' ? null : parseFloat(val)
  if (val !== '' && (isNaN(v) || v < 0)) return
  await store.setPrep(r.id, v)
}
</script>
