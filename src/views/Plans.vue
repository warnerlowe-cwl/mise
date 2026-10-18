<template>
  <div class="plans-screen">
    <div class="plans-header">
      <div class="logo-mark" style="width:40px;height:40px;border-radius:10px;background:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="20" height="20" viewBox="0 0 14 14" fill="none" stroke="rgba(0,0,0,0.8)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 7h10v4a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 11V7z"/>
          <path d="M1 7h12"/><path d="M2 9.5H0.5M13.5 9.5H12"/>
          <path d="M5 5V3.5M7 5.5V3M9 5V3.5"/>
        </svg>
      </div>
      <h1 class="plans-title">Unlock the pro tools</h1>
      <p class="plans-sub">The free app stays free, with up to {{ FREE_LIMITS.recipes }} recipes and {{ FREE_LIMITS.ingredients }} ingredients. Premium removes the limits and adds every pro tool.</p>
      <p class="plans-account">Signed in as <strong>{{ authStore.user?.email }}</strong> ·
        <button class="link-btn" @click="authStore.signOut()">Sign out</button>
      </p>
    </div>

    <!-- Free vs Premium -->
    <div class="compare-box">
      <div class="compare-col">
        <div class="compare-tier">Free</div>
        <div class="compare-tier-sub">The core app on one computer, free for good</div>
        <ul class="compare-list">
          <li>Up to {{ FREE_LIMITS.recipes }} recipes and {{ FREE_LIMITS.ingredients }} ingredients</li>
          <li>Menu pricing</li>
          <li>Inventory &amp; par levels</li>
          <li>Suppliers &amp; order sheets</li>
          <li>Allergen tags</li>
          <li>Waste tracking &amp; reports</li>
          <li>Backup &amp; restore</li>
        </ul>
      </div>
      <div class="compare-col compare-col-premium">
        <div class="compare-tier">Premium <span style="color:var(--accent)">★</span></div>
        <div class="compare-tier-sub">Everything in Free, plus the pro tools</div>
        <ul class="compare-list compare-list-premium">
          <li>Unlimited recipes and ingredients</li>
          <li>Scan Invoice (photos and PDFs)</li>
          <li>Menu Engineering (Stars / Dogs)</li>
          <li>Plate Cost (food + labor)</li>
          <li>Sizes: S/M/L &amp; scoop pricing</li>
          <li>Sub-recipes (buttercream, syrups, doughs)</li>
          <li>Compare Prices across suppliers</li>
          <li>Price Trends</li>
          <li>Batch Calculator &amp; Prep Planner</li>
          <li>Spec Sheets &amp; Menu Card (printables)</li>
          <li>CSV export</li>
        </ul>
      </div>
    </div>

    <!-- 14-day trial (once per account) -->
    <div v-if="canTrial" class="trial-box">
      <div>
        <strong>Try every Premium tool free for 14 days.</strong>
        <span>No card needed. After 14 days you go back to Free and keep everything you made.</span>
      </div>
      <button class="btn btn-primary" :disabled="startingTrial" @click="trial">{{ startingTrial ? 'Starting…' : 'Start free trial' }}</button>
    </div>
    <p v-if="trialErr" class="check-msg check-err" style="text-align:center">{{ trialErr }}</p>

    <!-- Plan cards -->
    <div class="plans-grid">

      <!-- Founding kitchens: $100 a year for the first 20, while they stay subscribed -->
      <div v-if="founding.available" class="plan-card plan-card-featured">
        <div class="plan-badge plan-badge-accent">{{ founding.left }} of 20 left</div>
        <div class="plan-label">Founding kitchens</div>
        <div class="plan-price">$100<span class="plan-per">/year</span></div>
        <div class="plan-desc">For the first 20 kitchens. Stays $100 a year for as long as you stay subscribed.</div>
        <ul class="plan-features">
          <li>Full access to all features</li>
          <li>1 installation</li>
          <li>Renews annually at $100</li>
        </ul>
        <button class="btn btn-primary plan-btn" :disabled="buyingSession" @click="buyFixed('founding_yearly')">{{ buyingSession ? 'Loading…' : 'Get Started' }}</button>
      </div>

      <!-- Yearly -->
      <div class="plan-card" :class="{ 'plan-card-featured': !founding.available }">
        <div class="plan-badge plan-badge-accent">Best value</div>
        <div class="plan-label">Yearly</div>
        <div class="plan-price">$150<span class="plan-per">/year</span></div>
        <div class="plan-desc">Best value: $12.50 a month, billed yearly.</div>
        <ul class="plan-features">
          <li>Full access to all features</li>
          <li>1 installation</li>
          <li>Renews annually</li>
        </ul>
        <button class="btn btn-primary plan-btn" :disabled="buyingSession" @click="buyFixed('yearly')">{{ buyingSession ? 'Loading…' : 'Get Started' }}</button>
      </div>

      <!-- Monthly -->
      <div class="plan-card">
        <div class="plan-label">Monthly</div>
        <div class="plan-price">$15<span class="plan-per">/mo</span></div>
        <div class="plan-desc">Pay month to month, cancel anytime.</div>
        <ul class="plan-features">
          <li>Full access to all features</li>
          <li>1 installation</li>
          <li>Renews automatically</li>
        </ul>
        <button class="btn btn-ghost plan-btn" :disabled="buyingSession" @click="buyFixed('monthly')">{{ buyingSession ? 'Loading…' : 'Get Started' }}</button>
      </div>

      <!-- 6-Month -->
      <div class="plan-card">
        <div class="plan-badge">Save $10</div>
        <div class="plan-label">6 Months</div>
        <div class="plan-price">$80<span class="plan-per">/6 months</span></div>
        <div class="plan-desc">About $13.33 a month, billed every 6 months.</div>
        <ul class="plan-features">
          <li>Full access to all features</li>
          <li>1 installation</li>
          <li>Renews every 6 months</li>
        </ul>
        <button class="btn btn-ghost plan-btn" :disabled="buyingSession" @click="buyFixed('six_month')">{{ buyingSession ? 'Loading…' : 'Get Started' }}</button>
      </div>

    </div>

    <p class="plans-promise">The free app stays free. Cancel Premium anytime and keep your data.</p>

    <!-- Already paid check -->
    <div class="plans-verify">
      <p>Already completed a payment?</p>
      <button class="btn btn-ghost" :disabled="checking" @click="checkLicense">
        {{ checking ? 'Checking…' : 'Activate my license' }}
      </button>
      <div v-if="checkMessage" class="check-msg" :class="checkOk ? 'check-ok' : 'check-err'">
        {{ checkMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { openUrl } from '@tauri-apps/plugin-opener'
import { FREE_LIMITS } from '../lib/plan'

const router = useRouter()
const authStore = useAuthStore()

// Safety net: a logged-in user who actually holds a valid license must never be stranded
// on this plans/paywall screen. Ensure the license is fetched, then send them to the app.
// Belt-and-suspenders with the router guard, so any timing hiccup self-corrects.
onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.license) await authStore.refreshLicense()
  if (authStore.hasActiveLicense) router.replace('/dashboard')
})
watch(() => authStore.hasActiveLicense, (ok) => { if (ok) router.replace('/dashboard') })

const API = import.meta.env.VITE_MISE_API_URL
const canTrial = computed(() => authStore.isLoggedIn && !authStore.everHadLicense)
const startingTrial = ref(false)
const trialErr = ref('')
const founding = ref({ available: false, left: 0 })

onMounted(async () => {
  try { founding.value = await (await fetch(`${API}/founding`)).json() } catch (_) { /* founding card stays hidden */ }
})

async function trial() {
  startingTrial.value = true
  trialErr.value = ''
  try {
    await authStore.startTrial()     // the watch above then takes them to the dashboard
  } catch (e) {
    trialErr.value = e.message
  } finally {
    startingTrial.value = false
  }
}

const buyingSession = ref(false)
const checking = ref(false)
const checkMessage = ref('')
const checkOk = ref(false)

async function buyFixed(planType) {
  buyingSession.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_MISE_API_URL}/checkout/fixed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authStore.user.id,
        user_email: authStore.user.email,
        plan_type: planType,
      }),
    })
    const { url, error } = await res.json()
    if (error) throw new Error(error)
    await openUrl(url)
  } catch (err) {
    alert('Could not create checkout: ' + err.message)
  } finally {
    buyingSession.value = false
  }
}

async function checkLicense() {
  checking.value = true
  checkMessage.value = ''
  try {
    await authStore.refreshLicense()
    if (authStore.hasActiveLicense) {
      checkOk.value = true
      checkMessage.value = 'License activated! Taking you to the app…'
      setTimeout(() => router.push('/dashboard'), 1200)
    } else {
      checkOk.value = false
      checkMessage.value = 'No active license found yet. Please complete payment and try again.'
    }
  } finally {
    checking.value = false
  }
}
</script>

<style scoped>
.trial-box { max-width: 1200px; margin: 0 auto 20px; display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: var(--surface); border: 1px solid var(--accent); border-radius: 12px; padding: 16px 20px; }
.trial-box strong { display: block; color: var(--text); font-size: 15px; margin-bottom: 3px; }
.trial-box span { color: var(--text-dim); font-size: 13px; }
.plans-promise { text-align: center; color: var(--text-dim); font-size: 13px; margin: -20px 0 28px; }
.plans-screen {
  min-height: 100vh;
  background: var(--bg);
  padding: 40px 32px;
  overflow-y: auto;
}

.plans-header {
  text-align: center;
  margin-bottom: 36px;
}

.plans-title { font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
.plans-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 10px; }
.plans-account { font-size: 12px; color: var(--text-muted); }

.link-btn {
  background: none; border: none; color: var(--accent);
  font-size: 12px; font-weight: 600; cursor: pointer; padding: 0;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto 40px;
}

.plan-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s;
}

.plan-card:hover { border-color: rgba(245,158,11,0.4); }
.plan-card-featured { border-color: var(--accent); }

.plan-badge {
  position: absolute;
  top: -10px;
  right: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 3px 8px;
  border-radius: 20px;
}

.plan-badge-accent {
  background: rgba(245,158,11,0.15);
  border-color: rgba(245,158,11,0.4);
  color: var(--accent);
}

.plan-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.plan-price {
  font-size: 32px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
  margin-bottom: 10px;
}

.plan-price-custom { margin-bottom: 10px; }
.plan-price-calc { font-size: 28px; font-weight: 800; color: var(--text); line-height: 1; }
.plan-price-muted { font-size: 20px; color: var(--text-muted); }

.plan-per { font-size: 14px; font-weight: 500; color: var(--text-muted); }

.plan-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
  line-height: 1.5;
}

.plan-features {
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  flex: 1;
}

.plan-features li {
  font-size: 13px;
  color: var(--text-dim);
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.plan-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--green);
  font-weight: 700;
}

.plan-btn { width: 100%; justify-content: center; }


.plans-verify {
  text-align: center;
  padding: 24px;
  border-top: 1px solid var(--border);
  max-width: 400px;
  margin: 0 auto;
}

.plans-verify p { color: var(--text-muted); font-size: 13px; margin-bottom: 12px; }

.check-msg {
  margin-top: 12px;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 6px;
}

.check-ok { background: rgba(16,185,129,0.1); color: var(--green); border: 1px solid rgba(16,185,129,0.3); }
.check-err { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }

.compare-box {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  max-width: 720px; margin: 0 auto 28px;
}
.compare-col {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 18px 20px;
}
.compare-col-premium { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.04); }
.compare-tier { font-size: 16px; font-weight: 800; }
.compare-tier-sub { font-size: 12px; color: var(--text-muted); margin: 2px 0 12px; }
.compare-list { list-style: none; padding: 0; margin: 0; }
.compare-list li {
  font-size: 13px; color: var(--text-dim); padding: 5px 0 5px 22px; position: relative;
}
.compare-list li::before {
  content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700;
}
.compare-list-premium li::before { color: var(--accent); }
@media (max-width: 600px) { .compare-box { grid-template-columns: 1fr; } }
</style>
