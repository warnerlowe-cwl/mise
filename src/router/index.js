import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Dashboard from '../views/Dashboard.vue'
import Ingredients from '../views/Ingredients.vue'
import Recipes from '../views/Recipes.vue'
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
  if (!auth.hasActiveLicense) return '/plans'

  return true
})

export default router
