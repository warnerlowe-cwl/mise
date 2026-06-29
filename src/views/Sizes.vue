<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Sizes</h1>
        <p class="page-subtitle">Cost and margin for every size you sell — S/L, 12/16oz, single/double scoop</p>
      </div>
    </div>

    <div v-if="rows.length" style="margin-top:16px; display:flex; flex-direction:column; gap:14px">
      <div v-for="r in rows" :key="r.id" class="card" style="padding:16px">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px">
          <strong style="font-size:16px">{{ r.name }}</strong>
          <span style="color:var(--text-dim); font-size:12px">base {{ cur }}{{ r.baseCost.toFixed(2) }}/serving</span>
        </div>
        <table class="table">
          <thead>
            <tr><th>Size</th><th>Portion</th><th>Cost</th><th>Price</th><th>Margin</th><th>Food cost</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in r.sizes" :key="s.id">
              <td style="font-weight:600">{{ s.label }}</td>
              <td style="color:var(--text-dim)">{{ s.portion_mult }}×</td>
              <td>{{ cur }}{{ s.cost.toFixed(2) }}</td>
              <td>{{ s.price != null ? cur + s.price.toFixed(2) : '—' }}</td>
              <td>
                <span v-if="s.price != null" :style="{ color: s.margin >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight:600 }">
                  {{ cur }}{{ s.margin.toFixed(2) }}
                </span>
                <span v-else style="color:var(--text-dim); font-size:12px">set a price</span>
              </td>
              <td>
                <span v-if="s.price != null && s.price > 0" :style="{ color: s.fcPct <= 35 ? '#6ee7b7' : '#fca5a5' }">
                  {{ s.fcPct.toFixed(0) }}%
                </span>
                <span v-else style="color:var(--text-dim)">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="card" style="margin-top:16px; padding:40px; text-align:center; color:var(--text-dim)">
      No sizes yet. Open a recipe (Recipes → Edit) and add sizes in the <strong style="color:var(--text)">Sizes</strong> section —
      e.g. Small 0.8×, Regular 1×, Large 1.3× — each with its own price.
    </div>

    <div class="card" style="margin-top:16px; padding:16px">
      <p style="color:var(--text-dim); font-size:13px; margin:0; line-height:1.6">
        💡 A size's cost is the recipe's base cost per serving × its portion multiplier. Set a price per size and
        Mise shows the margin and food-cost % for each — so a 16oz latte and a single scoop are each priced right,
        not guessed from the regular size.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'

const store = useRecipesStore()
const sizesByRecipe = ref({})

onMounted(async () => {
  await store.fetchAll()
  const map = {}
  for (const r of store.recipes) {
    const s = await store.getSizes(r.id)
    if (s.length) map[r.id] = s
  }
  sizesByRecipe.value = map
})

const rows = computed(() =>
  store.recipes
    .filter((r) => sizesByRecipe.value[r.id])
    .map((r) => {
      const baseCost = (Number(r.total_cost) || 0) / (Number(r.servings) || 1)
      const sizes = sizesByRecipe.value[r.id].map((s) => {
        const cost = baseCost * (Number(s.portion_mult) || 0)
        const price = s.menu_price != null ? Number(s.menu_price) : null
        const margin = price != null ? price - cost : 0
        const fcPct = price ? (cost / price) * 100 : 0
        return { ...s, cost, price, margin, fcPct }
      })
      return { id: r.id, name: r.name, baseCost, sizes }
    })
)
</script>
