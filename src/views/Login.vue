<template>
  <div class="auth-screen">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="logo-mark logo-mark-xl">
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none" stroke="rgba(0,0,0,0.8)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 7h10v4a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 11V7z"/>
            <path d="M1 7h12"/>
            <path d="M2 9.5H0.5M13.5 9.5H12"/>
            <path d="M5 5V3.5M7 5.5V3M9 5V3.5"/>
          </svg>
        </div>
        <div>
          <div class="auth-app-name">Mise</div>
          <div class="auth-tagline">by CrownWell Labs</div>
        </div>
      </div>

      <div class="auth-tabs">
        <button :class="['auth-tab', { active: tab === 'signin' }]" @click="tab = 'signin'">Sign In</button>
        <button :class="['auth-tab', { active: tab === 'signup' }]" @click="tab = 'signup'">Create Account</button>
      </div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="email"
            class="form-input"
            type="email"
            placeholder="chef@yourrestaurant.com"
            autocomplete="email"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="password"
            class="form-input"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
            minlength="8"
          />
        </div>

        <div v-if="tab === 'signup'" class="form-group">
          <label class="form-label">Confirm Password</label>
          <input
            v-model="confirmPassword"
            class="form-input"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
        </div>

        <div v-if="error" class="auth-error">{{ error }}</div>
        <div v-if="message" class="auth-message">{{ message }}</div>

        <button type="submit" class="btn btn-primary auth-submit" :disabled="submitting">
          {{ submitting ? 'Please wait…' : (tab === 'signin' ? 'Sign In' : 'Create Account') }}
        </button>
      </form>

      <div class="auth-footer">
        <span v-if="tab === 'signin'">Don't have an account?</span>
        <span v-else>Already have an account?</span>
        <button class="auth-switch" @click="tab = tab === 'signin' ? 'signup' : 'signin'">
          {{ tab === 'signin' ? 'Create one' : 'Sign in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const tab = ref('signin')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const message = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  message.value = ''
  submitting.value = true

  try {
    if (tab.value === 'signup') {
      if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match.'
        return
      }
      await authStore.signUp(email.value, password.value)
      router.push('/dashboard')
    } else {
      await authStore.signIn(email.value, password.value)
      // Always open the app after sign-in — no paywall gate. The license unlocks premium
      // features inside; buying happens on the website. (This also dodges the race where
      // the license hadn't finished loading and the user got bounced to /plans.)
      router.push('/dashboard')
    }
  } catch (err) {
    error.value = err.message ?? 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-screen {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.auth-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 36px;
  width: 420px;
  max-width: 95vw;
  box-shadow: 0 32px 80px rgba(0,0,0,0.5);
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 32px;
}

.logo-mark-xl {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auth-app-name {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.3px;
}

.auth-tagline {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 1px;
}

.auth-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 24px;
}

.auth-tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.auth-tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.auth-error {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  color: var(--red);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 14px;
}

.auth-message {
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.3);
  color: var(--green);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 14px;
}

.auth-submit {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 14px;
  margin-top: 4px;
}

.auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.auth-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.auth-switch {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
  padding: 0;
}
</style>
