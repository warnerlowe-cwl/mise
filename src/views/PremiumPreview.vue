<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ tool.title }} <span class="pp-tag">Premium</span></h1>
        <p class="page-subtitle">{{ tool.what }}</p>
      </div>
    </div>

    <div class="card pp-card">
      <div class="pp-label">From your kitchen</div>
      <p class="pp-preview">{{ preview }}</p>
      <ul class="pp-list">
        <li v-for="b in tool.points" :key="b">{{ b }}</li>
      </ul>

      <div class="pp-actions">
        <button v-if="canTrial" class="btn btn-primary" :disabled="starting" @click="trial">
          {{ starting ? 'Starting…' : 'Try Premium free for 14 days' }}
        </button>
        <button class="btn" :class="canTrial ? 'btn-ghost' : 'btn-primary'" @click="$router.push('/plans')">See plans</button>
      </div>
      <p class="pp-fine">
        <template v-if="canTrial">No card needed. After 14 days you go back to Free and keep everything you made.</template>
        <template v-else>From $12.50 a month on Yearly. Cancel anytime and keep your data.</template>
      </p>
      <p v-if="err" class="pp-err">{{ err }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRecipesStore } from '../stores/recipes'
import { useIngredientsStore } from '../stores/ingredients'
import { currency } from '../currency'

// What a free user sees when they open a Premium tool (17 Oct 2026): the tool, a line from their own data,
// and a trial or plans button, instead of being sent straight to the Plans page.
const TOOLS = {
  menu: { title: 'Menu Engineering', what: 'See which dishes earn their place on your menu.', points: [
    'Sorts every dish into Stars, Plowhorses, Puzzles and Dogs by profit and popularity',
    'Shows what to promote, what to reprice and what to drop'] },
  plate: { title: 'Plate Cost', what: 'The true cost of each plate: food plus prep time.', points: [
    'Adds prep minutes at your labor rate to the food cost', 'Shows the real margin on every dish'] },
  sizes: { title: 'Sizes', what: 'Price small, medium and large from one recipe.', points: [
    'Cost and price each size or scoop from the same recipe', 'Margin and food cost % for every size'] },
  'menu-card': { title: 'Menu Card', what: 'A clean printable menu for your guests.', points: [
    'Built from your recipes and menu prices', 'Print it or save it as a PDF'] },
  prices: { title: 'Price Trends', what: 'See which ingredient prices keep creeping up.', points: [
    'Every price you record is kept with its date', 'Spot the items that cost more every month'] },
  scale: { title: 'Batch Calculator', what: 'Scale any recipe up or down, with costs.', points: [
    'Quantities and cost for any batch size', 'Includes sub-recipes'] },
  prep: { title: 'Prep Planner', what: "Turn tomorrow's covers into one costed shopping and prep list.", points: [
    'Enter how many of each dish you will make', 'Get one merged list with what it will cost'] },
  specs: { title: 'Spec Sheets', what: 'Printable, costed recipe cards for the line.', points: [
    'Ingredients, quantities, allergens and cost on one card', 'Same dish, same way, every shift'] },
  compare: { title: 'Compare Prices', what: 'Record quotes from each supplier and see who is cheapest.', points: [
    'Keep several suppliers per ingredient', 'Switch the price your recipes use in one click'] },
  scan: { title: 'Scan Invoice', what: 'Photograph or open a supplier invoice and MenuCents finds the new prices.', points: [
    'Reads photos and PDFs on your computer; invoices are never uploaded',
    'Matches each line to your ingredients and flags big price jumps for you to check',
    'One click updates the prices and re-costs every recipe that uses them'] },
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const recipes = useRecipesStore()
const ingredients = useIngredientsStore()

const key = computed(() => String(route.params.tool || ''))
const tool = computed(() => TOOLS[key.value] || { title: 'Premium', what: 'The pro tools for your kitchen.', points: [] })
const canTrial = computed(() => auth.isLoggedIn && !auth.everHadLicense)
const starting = ref(false)
const err = ref('')

onMounted(async () => {
  if (auth.hasActiveLicense) return router.replace('/' + key.value)
  if (!recipes.recipes.length) await recipes.fetchAll()
  if (!ingredients.ingredients.length) await ingredients.fetchAll()
  if (key.value === 'prices') await ingredients.loadPriceHistory()
})
watch(() => auth.hasActiveLicense, (ok) => { if (ok) router.replace('/' + key.value) })

const money = (n) => `${currency.value}${(Number(n) || 0).toFixed(2)}`
const perServing = (r) => (Number(r.total_cost) || 0) / (Number(r.servings) || 1)

const preview = computed(() => {
  const rs = recipes.recipes
  const n = rs.length
  if (!n && key.value !== 'compare' && key.value !== 'scan' && key.value !== 'prices') {
    return 'Add a few recipes first; then this shows your own numbers.'
  }
  const costly = [...rs].sort((a, b) => perServing(b) - perServing(a))[0]
  switch (key.value) {
    case 'menu': {
      const sold = rs.filter((r) => Number(r.units_sold) > 0 && Number(r.menu_price) > 0)
      if (sold.length < 4) return `You have ${n} recipes. Add menu prices and how many of each you sell, and Menu Engineering sorts them for you.`
      const margin = (r) => Number(r.menu_price) - perServing(r)
      const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
      const mM = med(sold.map(margin)), mS = med(sold.map((r) => Number(r.units_sold)))
      const dogs = sold.filter((r) => margin(r) < mM && Number(r.units_sold) < mS).length
      return dogs
        ? `${dogs} of your ${sold.length} priced dishes earn less and sell less than the rest. Premium shows which ones.`
        : `Your ${sold.length} priced dishes are ready to sort into Stars, Plowhorses, Puzzles and Dogs.`
    }
    case 'plate':
      return `Your ${costly.name} costs ${money(perServing(costly))} a serving in food. Plate Cost adds the prep time at your labor rate.`
    case 'sizes':
      return `Any of your ${n} recipes can be sold in sizes, each with its own cost, price and margin.`
    case 'menu-card':
      return `Print a menu from your ${n} recipes, with the prices you set.`
    case 'prices': {
      const up = Object.values(ingredients.priceHistory || {})
        .filter((h) => h.length > 1 && Number(h[h.length - 1].cost_per_unit) > Number(h[0].cost_per_unit)).length
      return up
        ? `${up} of your ingredients cost more now than when you added them. Premium shows how much, and when.`
        : `MenuCents keeps a dated history of every price you record for your ${ingredients.ingredients.length} ingredients.`
    }
    case 'scale':
      return `Make a double batch of ${costly.name}? Batch Calculator scales the quantities and the cost for you.`
    case 'prep':
      return `Plan tomorrow from your ${n} recipes: one shopping list, already costed.`
    case 'specs':
      return `A costed recipe card for each of your ${n} recipes, ready to print for the line.`
    case 'compare': {
      const sup = new Set(ingredients.ingredients.map((i) => (i.supplier || '').trim()).filter(Boolean)).size
      return sup > 1
        ? `You buy from ${sup} suppliers. Compare Prices shows who is cheapest for each item.`
        : 'Record a quote from each supplier and see who is cheapest for each item.'
    }
    case 'scan':
      return `Instead of typing prices for your ${ingredients.ingredients.length} ingredients, drop in the invoice and check what MenuCents found.`
    default:
      return ''
  }
})

async function trial() {
  starting.value = true
  err.value = ''
  try {
    await auth.startTrial()
  } catch (e) {
    err.value = e.message
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.pp-tag { font-size: 12px; font-weight: 700; color: var(--accent); border: 1px solid var(--accent); border-radius: 999px; padding: 2px 9px; vertical-align: middle; margin-left: 6px; }
.pp-card { max-width: 640px; padding: 26px 28px; }
.pp-label { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
.pp-preview { font-size: 18px; line-height: 1.45; color: var(--text); margin: 0 0 16px; }
.pp-list { margin: 0 0 22px; padding-left: 18px; color: var(--text-dim); font-size: 14px; line-height: 1.7; }
.pp-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.pp-fine { font-size: 12px; color: var(--text-muted); margin: 12px 0 0; }
.pp-err { font-size: 13px; color: var(--red); margin: 10px 0 0; }
</style>
