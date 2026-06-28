<template>
  <div class="page">
    <div class="page-header no-print">
      <div>
        <h1 class="page-title">Menu Card</h1>
        <p class="page-subtitle">Lay your priced dishes out as a clean menu and print it for the front of house</p>
      </div>
    </div>

    <div class="card no-print" style="padding:16px; display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap">
      <div style="flex:1; min-width:220px">
        <label class="form-label">Menu title</label>
        <input v-model="title" class="form-input" maxlength="60" placeholder="e.g. Spring Menu" />
      </div>
      <label style="display:flex; align-items:center; gap:6px; color:var(--text-dim); white-space:nowrap; cursor:pointer">
        <input type="checkbox" v-model="groupByCategory" /> Group by category
      </label>
      <button class="btn btn-primary" :disabled="!priced.length" @click="print">🖨 Print menu</button>
    </div>

    <div v-if="priced.length" class="printable">
      <div class="menu-card">
        <h2 class="menu-title">{{ title || 'Menu' }}</h2>
        <div class="menu-rule"></div>

        <template v-if="groupByCategory">
          <div v-for="g in grouped" :key="g.name" class="menu-group">
            <h3 class="menu-cat">{{ g.name }}</h3>
            <div v-for="r in g.items" :key="r.id" class="menu-row">
              <span class="menu-name">{{ r.name }}</span>
              <span class="menu-dots"></span>
              <span class="menu-price">${{ r.price.toFixed(2) }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-for="r in sortedAll" :key="r.id" class="menu-row">
            <span class="menu-name">{{ r.name }}</span>
            <span class="menu-dots"></span>
            <span class="menu-price">${{ r.price.toFixed(2) }}</span>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="card no-print" style="margin-top:16px; padding:40px; text-align:center; color:var(--text-dim)">
      No priced dishes yet — set menu prices in
      <RouterLink to="/pricing" style="color:var(--accent)">Menu Pricing</RouterLink> and they'll appear here.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '../stores/recipes'
import { useAuthStore } from '../stores/auth'

const store = useRecipesStore()
const auth = useAuthStore()
const groupByCategory = ref(true)
const title = ref('')

onMounted(async () => {
  await store.fetchAll()
  title.value = auth.businessName || 'Menu'
})

const priced = computed(() =>
  store.recipes
    .filter((r) => r.menu_price != null && Number(r.menu_price) > 0)
    .map((r) => ({ id: r.id, name: r.name, category: (r.category || '').trim() || 'Menu', price: Number(r.menu_price) }))
)

const sortedAll = computed(() => [...priced.value].sort((a, b) => a.name.localeCompare(b.name)))

const grouped = computed(() => {
  const m = {}
  for (const r of priced.value) (m[r.category] ||= []).push(r)
  return Object.keys(m)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, items: m[name].sort((a, b) => a.name.localeCompare(b.name)) }))
})

function print() {
  window.print()
}
</script>

<style scoped>
.menu-card {
  background: #fff; color: #1a1a1a; max-width: 620px; margin: 16px auto;
  padding: 40px 44px; border-radius: 10px; border: 1px solid #e3e3e3;
  font-family: Georgia, 'Times New Roman', serif;
}
.menu-title { text-align: center; font-size: 28px; margin: 0; letter-spacing: 0.02em; }
.menu-rule { height: 2px; background: #1a1a1a; width: 60px; margin: 12px auto 26px; }
.menu-group { margin-bottom: 22px; }
.menu-cat { font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin: 0 0 10px; font-family: -apple-system, system-ui, sans-serif; }
.menu-row { display: flex; align-items: baseline; margin: 9px 0; font-size: 16px; }
.menu-name { white-space: nowrap; }
.menu-dots { flex: 1; border-bottom: 1px dotted #bbb; margin: 0 8px; transform: translateY(-4px); }
.menu-price { white-space: nowrap; font-weight: 600; }
</style>
