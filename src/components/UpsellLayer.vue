<template>
  <!-- Free plan limit reached -->
  <div v-if="upsell.limit" class="modal-overlay" @click.self="upsell.closeLimit()">
    <div class="modal ul-modal">
      <h2 class="modal-title">The free plan holds {{ limitOf(upsell.limit.kind) }} {{ upsell.limit.kind }}</h2>
      <p class="ul-text">
        You have {{ upsell.limit.count }}.
        <template v-if="upsell.limit.left > 0 && upsell.limit.adding > 1">
          {{ upsell.limit.left }} more fit on Free, so pick {{ upsell.limit.left }} or fewer, or
        </template>
        <template v-else>To add more,</template>
        go Premium for unlimited {{ upsell.limit.kind }} and every pro tool.
      </p>
      <p class="ul-text ul-dim">Everything you have made stays yours, on Free or Premium.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" @click="upsell.closeLimit()">Not now</button>
        <button v-if="canTrial" class="btn btn-ghost" :disabled="starting" @click="trial">
          {{ starting ? 'Starting…' : 'Try Premium free for 14 days' }}
        </button>
        <button class="btn btn-primary" @click="plans">See plans</button>
      </div>
      <p v-if="err" class="ul-err">{{ err }}</p>
    </div>
  </div>

  <!-- A Premium tip (free users only, at most one a week) -->
  <div v-if="upsell.tip" class="ul-tip" role="status">
    <div class="ul-tip-text">{{ upsell.tip.text }}</div>
    <div class="ul-tip-actions">
      <button class="btn btn-primary ul-sm" @click="go">{{ upsell.tip.action }}</button>
      <button class="btn btn-ghost ul-sm" @click="upsell.closeTip()">Close</button>
      <button class="ul-off" @click="upsell.setTipsOff(true)">Don't show tips</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUpsellStore } from '../stores/upsell'
import { useAuthStore } from '../stores/auth'
import { FREE_LIMITS } from '../lib/plan'

const upsell = useUpsellStore()
const auth = useAuthStore()
const router = useRouter()
const starting = ref(false)
const err = ref('')
const canTrial = computed(() => auth.isLoggedIn && !auth.everHadLicense)
const limitOf = (kind) => FREE_LIMITS[kind]

function plans() { upsell.closeLimit(); router.push('/plans') }
function go() { const to = upsell.tip.to; upsell.closeTip(); router.push(to) }

async function trial() {
  starting.value = true
  err.value = ''
  try {
    await auth.startTrial()
    upsell.closeLimit()
  } catch (e) {
    err.value = e.message
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.ul-modal { max-width: 600px; }
.ul-modal .btn { white-space: nowrap; }
.ul-text { font-size: 14px; color: var(--text); line-height: 1.55; margin: 0 0 10px; }
.ul-dim { color: var(--text-muted); font-size: 13px; }
.ul-err { color: var(--red); font-size: 13px; margin-top: 10px; }
.ul-tip { position: fixed; right: 20px; bottom: 20px; z-index: 900; max-width: 360px; background: var(--surface); border: 1px solid var(--accent); border-radius: 10px; padding: 14px 16px; box-shadow: 0 10px 30px rgba(0,0,0,.45); }
.ul-tip-text { font-size: 13.5px; color: var(--text); line-height: 1.5; margin-bottom: 10px; }
.ul-tip-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ul-sm { padding: 5px 12px; font-size: 12.5px; }
.ul-off { background: none; border: none; color: var(--text-muted); font-size: 12px; cursor: pointer; padding: 0; margin-left: auto; }
.ul-off:hover { color: var(--text-dim); }
</style>
