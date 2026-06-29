import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Dashboard from '../views/Dashboard.vue'
import Ingredients from '../views/Ingredients.vue'
import Recipes from '../views/Recipes.vue'
import MenuPricing from '../views/MenuPricing.vue'
import Inventory from '../views/Inventory.vue'
import PriceTrends from '../views/PriceTrends.vue'
import Scaling from '../views/Scaling.vue'
import Allergens from '../views/Allergens.vue'
import Suppliers from '../views/Suppliers.vue'
import PrepPlanner from '../views/PrepPlanner.vue'
import MenuEngineering from '../views/MenuEngineering.vue'
import SpecSheets from '../views/SpecSheets.vue'
import PlateCost from '../views/PlateCost.vue'
import PrintMenu from '../views/PrintMenu.vue'
import PriceCompare from '../views/PriceCompare.vue'
import Sizes from '../views/Sizes.vue'
import WasteTracker from '../views/WasteTracker.vue'
import Conversions from '../views/Conversions.vue'
import Reports from '../views/Reports.vue'
import Login from '../views/Login.vue'
import Plans from '../views/Plans.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/',            redirect: '/dashboard' },
  { path: '/login',       component: Login,       meta: { public: true } },
  { path: '/plans',       component: Plans,       meta: { public: true } },
  { path: '/dashboard',   component: Dashboard,   meta: { title: 'Dashboard' } },
  { path: '/ingredients', component: Ingredients, meta: { title: 'Ingredients' } },
  { path: '/recipes',     component: Recipes,     meta: { title: 'Recipes' } },
  { path: '/pricing',     component: MenuPricing, meta: { title: 'Menu Pricing' } },
  { path: '/menu',        component: MenuEngineering, meta: { title: 'Menu Engineering' } },
  { path: '/plate',       component: PlateCost,  meta: { title: 'Plate Cost' } },
  { path: '/sizes',       component: Sizes,      meta: { title: 'Sizes' } },
  { path: '/menu-card',   component: PrintMenu,  meta: { title: 'Menu Card' } },
  { path: '/inventory',   component: Inventory,   meta: { title: 'Inventory' } },
  { path: '/prices',      component: PriceTrends, meta: { title: 'Price Trends' } },
  { path: '/scale',       component: Scaling,    meta: { title: 'Batch Calculator' } },
  { path: '/prep',        component: PrepPlanner, meta: { title: 'Prep Planner' } },
  { path: '/specs',       component: SpecSheets, meta: { title: 'Spec Sheets' } },
  { path: '/allergens',   component: Allergens,  meta: { title: 'Allergens' } },
  { path: '/suppliers',   component: Suppliers,  meta: { title: 'Suppliers' } },
  { path: '/compare',     component: PriceCompare, meta: { title: 'Compare Prices' } },
  { path: '/waste',       component: WasteTracker, meta: { title: 'Waste Tracker' } },
  { path: '/conversions', component: Conversions, meta: { title: 'Conversions' } },
  { path: '/reports',     component: Reports,     meta: { title: 'Reports' } },
  { path: '/settings',    component: Settings,    meta: { title: 'Settings' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Wait for the initial session check to finish
  if (auth.loading) {
    await new Promise(resolve => {
      const stop = setInterval(() => {
        if (!auth.loading) { clearInterval(stop); resolve() }
      }, 50)
    })
  }

  if (to.meta.public) return true

  if (!auth.isLoggedIn) return '/login'

  // Paywall: the app requires an ACTIVE license. Make sure we've actually fetched the
  // license before deciding — otherwise a paying user could be bounced to /plans simply
  // because it hadn't loaded yet (the old race). Comp accounts have active licenses and
  // pass straight through. A transient fetch error leaves the license unset → /plans,
  // which is recoverable on reload once the network is back.
  if (!auth.license) {
    try { await auth.refreshLicense() } catch (_) { /* treated as no active license */ }
  }
  if (!auth.hasActiveLicense) return '/plans'

  return true
})

export default router
