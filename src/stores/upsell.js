import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

// Free to Premium (17 Oct 2026): the free-limit dialog and the occasional Premium tip.
// Tips: free users only, each tip once, at most one a week, and never if switched off in Settings.
const TIPS_OFF = 'mise_tips_off'
const LAST_TIP = 'mise_tip_last'
const WEEK = 7 * 86400 * 1000

function ls(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key)
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch (_) { return null }
}

export const useUpsellStore = defineStore('upsell', {
  state: () => ({
    limit: null,          // the LimitError behind an open dialog
    tip: null,            // { id, text, to, action }
    tipsOff: ls(TIPS_OFF) === '1',
  }),

  actions: {
    limitHit(err) { this.limit = err },
    closeLimit() { this.limit = null },

    // Shows a tip unless the user is on Premium, switched tips off, saw this one, or saw any tip this week.
    offerTip(id, text, to, action = 'Show me') {
      if (useAuthStore().hasActiveLicense || this.tipsOff || this.tip) return
      if (ls('mise_tip_seen_' + id)) return
      if (Date.now() - Number(ls(LAST_TIP) || 0) < WEEK) return
      ls('mise_tip_seen_' + id, '1')
      ls(LAST_TIP, String(Date.now()))
      this.tip = { id, text, to, action }
    },
    closeTip() { this.tip = null },
    setTipsOff(off) {
      this.tipsOff = !!off
      ls(TIPS_OFF, off ? '1' : null)
      if (off) this.tip = null
    },

    // Counts prices typed in by hand today; the 5th one suggests Scan Invoice.
    priceTyped() {
      const day = new Date().toISOString().slice(0, 10)
      const [d, n] = (ls('mise_prices_typed') || '').split('|')
      const count = (d === day ? Number(n) || 0 : 0) + 1
      ls('mise_prices_typed', `${day}|${count}`)
      if (count >= 5) this.offerTip('scan', 'Typing in supplier prices? Scan Invoice reads them from the invoice for you.', '/scan')
    },
  },
})
