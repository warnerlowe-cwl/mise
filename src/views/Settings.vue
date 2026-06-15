<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Your profile and account</p>
      </div>
    </div>

    <div class="card" style="max-width: 540px">
      <div class="section-header">Profile</div>
      <div class="form-group">
        <label class="form-label">Business name</label>
        <input
          v-model="businessName"
          class="form-input"
          type="text"
          maxlength="80"
          placeholder="e.g. Isebel's Cafe"
          @keydown.enter="save"
        />
        <p class="settings-hint">Your bakery, cafe, or kitchen name — shown across Mise.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="text" :value="authStore.user?.email || ''" disabled />
      </div>
      <div class="settings-actions">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
        <span class="settings-ok" v-if="saved">✓ Saved</span>
        <span class="settings-err" v-if="error">{{ error }}</span>
      </div>
    </div>

    <div class="card" style="max-width: 540px; margin-top: 16px">
      <div class="section-header">Account</div>
      <button class="btn btn-ghost" @click="authStore.signOut()">Sign out</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const businessName = ref('')
const saving = ref(false)
const saved = ref(false)
const error = ref('')

onMounted(() => { businessName.value = authStore.businessName })

async function save() {
  error.value = ''
  saved.value = false
  saving.value = true
  try {
    await authStore.updateProfile({ businessName: businessName.value })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e) {
    error.value = e?.message || 'Could not save'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.settings-hint { font-size: 12px; color: var(--text-muted); margin: 6px 0 0; }
.settings-actions { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.settings-ok { color: #16a34a; font-size: 13px; }
.settings-err { color: var(--red); font-size: 13px; }
</style>
