import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import { useAuthStore } from './stores/auth.js'
import { currency } from './currency.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// `cur` is available in every template as the active currency symbol (reactive:
// reading currency.value inside the getter ties it to each component's render).
Object.defineProperty(app.config.globalProperties, 'cur', { get: () => currency.value })

// Initialize auth before mounting so the router guard has session state
const auth = useAuthStore()
auth.init().then(() => app.mount('#app'))
