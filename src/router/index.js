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
  // Free/core
  { path: '/dashboard',   component: Dashboard,   meta: { title: 'Dashboard' } },
  { path: '/ingredients', component: Ingredients, meta: { title: 'Ingredients' } },
  { path: '/recipes',     component: Recipes,     meta: { title: 'Recipes' } },
  { path: '/pricing',     component: MenuPricing, meta: { title: 'Menu Pricing' } },
  { path: '/inventory',   component: Inventory,   meta: { title: 'Inventory' } },
  { path: '/allergens',   component: Allergens,  meta: { title: 'Allergens' } },
  { path: '/suppliers',   component: Suppliers,  meta: { title: 'Suppliers' } },
  { path: '/waste',       component: WasteTracker, meta: { title: 'Waste Tracker' } },
  { path: '/conversions', component: Conversions, meta: { title: 'Conversions' } },
  { path: '/reports',     component: Reports,     meta: { title: 'Reports' } },
  { path: '/settings',    component: Settings,    meta: { title: 'Settings' } },
  // Premium (require an active license)
  { path: '/menu',        component: MenuEngineering, meta: { title: 'Menu Engineering', premium: true } },
  { path: '/plate',       component: PlateCost,  meta: { title: 'Plate Cost', premium: true } },
  { path: '/sizes',       component: Sizes,      meta: { title: 'Sizes', premium: true } },
  { path: '/menu-card',   component: PrintMenu,  meta: { title: 'Menu Card', premium: true } },
  { path: '/prices',      component: PriceTrends, meta: { title: 'Price Trends', premium: true } },
  { path: '/scale',       component: Scaling,    meta: { title: 'Batch Calculator', premium: true } },
  { path: '/prep',        component: PrepPlanner, meta: { title: 'Prep Planner', premium: true } },
  { path: '/specs',       component: SpecSheets, meta: { title: 'Spec Sheets', premium: true } },
  { path: '/compare',     component: PriceCompare, meta: { title: 'Compare Prices', premium: true } },
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

  // Freemium: anyone signed in can use the core app for free. PREMIUM routes require an
  // active license. We fetch the license before gating so a paying user is never bounced
  // on the old race; a transient fetch error just means premium stays locked until reload.
  if (to.meta.premium) {
    if (!auth.license) {
      try { await auth.refreshLicense() } catch (_) { /* treated as no active license */ }
    }
    if (!auth.hasActiveLicense) return '/plans'
  }

  return true
})

export default router
