import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Dashboard from '../views/Dashboard.vue'
import Ingredients from '../views/Ingredients.vue'
import Recipes from '../views/Recipes.vue'
import MenuPricing from '../views/MenuPricing.vue'
import Inventory from '../views/Inventory.vue'
import PriceTrends from '../views/PriceTrends.vue'
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
  { path: '/inventory',   component: Inventory,   meta: { title: 'Inventory' } },
  { path: '/prices',      component: PriceTrends, meta: { title: 'Price Trends' } },
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

  // Signing in is all it takes to get into the app — no paywall gate. Pricing/buying
  // happens on the website (crownwelllabs.com), and the license simply unlocks premium
  // features inside the app. This makes "stuck on the plans screen" impossible: a
  // logged-in user always reaches the app. Load the license in the background so
  // features that depend on it are accurate, but never block access on it.
  if (!auth.isLoggedIn) return '/login'

  if (auth.isLoggedIn && !auth.license) auth.refreshLicense()

  return true
})

export default router
