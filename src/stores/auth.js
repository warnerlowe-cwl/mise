import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { setActiveUser } from '../db/database'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const license = ref(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)
  const businessName = computed(() => user.value?.user_metadata?.business_name || '')
  const hasActiveLicense = computed(() => {
    if (!license.value) return false
    if (license.value.status !== 'active') return false
    if (!license.value.expires_at) return true // lifetime
    return new Date(license.value.expires_at) > new Date()
  })
  const licenseStatus = computed(() => {
    if (!license.value) return 'none'
    if (license.value.status === 'cancelled') return 'cancelled'
    if (license.value.expires_at && new Date(license.value.expires_at) <= new Date()) return 'expired'
    return license.value.status // 'active' | 'past_due'
  })

  async function init() {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null
      setActiveUser(user.value?.id)        // scope local DB to this account
      if (user.value) await fetchLicense()
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      setActiveUser(user.value?.id)        // switch DB when the account changes
      // Only clear the license on sign-out. Previously this nulled it on every auth
      // event (incl. sign-in/refresh) BEFORE re-fetching, creating a window where a
      // logged-in user momentarily has no license — which bounced them to /plans.
      if (user.value) await fetchLicense()
      else license.value = null
    })
  }

  async function fetchLicense() {
    // Best-effort: never let a license-fetch hiccup (network, CORS, timeout) throw and
    // break sign-in or block the app. If it fails, the user still gets in; premium
    // features just won't unlock until the next successful fetch.
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error) license.value = data
    } catch (_) { /* leave license as-is; app stays accessible */ }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
    setActiveUser(user.value?.id)          // scope DB now, before the app navigates + loads data
    await fetchLicense()
    return data
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    user.value = data.user
    setActiveUser(user.value?.id)
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    license.value = null
    setActiveUser(null)                    // back to the guest DB
  }

  async function refreshLicense() {
    if (!user.value) return
    await fetchLicense()
  }

  async function updateProfile({ businessName }) {
    const { data, error } = await supabase.auth.updateUser({
      data: { business_name: (businessName || '').trim() },
    })
    if (error) throw error
    user.value = data.user
    return data
  }

  return {
    user, license, loading, businessName,
    isLoggedIn, hasActiveLicense, licenseStatus,
    init, signIn, signUp, signOut, refreshLicense, updateProfile,
  }
})
