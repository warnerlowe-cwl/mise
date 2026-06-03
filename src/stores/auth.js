import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const license = ref(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)
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
      if (user.value) await fetchLicense()
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      license.value = null
      if (user.value) await fetchLicense()
    })
  }

  async function fetchLicense() {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error) license.value = data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
    await fetchLicense()
    return data
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    user.value = data.user
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    license.value = null
  }

  async function refreshLicense() {
    if (!user.value) return
    await fetchLicense()
  }

  return {
    user, license, loading,
    isLoggedIn, hasActiveLicense, licenseStatus,
    init, signIn, signUp, signOut, refreshLicense,
  }
})
