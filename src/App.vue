<template>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(0,0,0,0.8)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 7h10v4a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 11V7z"/>
            <path d="M1 7h12"/>
            <path d="M2 9.5H0.5M13.5 9.5H12"/>
            <path d="M5 5V3.5M7 5.5V3M9 5V3.5"/>
          </svg>
        </div>
        <span class="logo-text">Mise</span>
      </div>

      <nav class="nav">
        <RouterLink to="/dashboard" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="6" height="6" rx="1.5"/>
            <rect x="11" y="3" width="6" height="6" rx="1.5"/>
            <rect x="3" y="11" width="6" height="6" rx="1.5"/>
            <rect x="11" y="11" width="6" height="6" rx="1.5"/>
          </svg>
          Dashboard
        </RouterLink>
        <RouterLink to="/ingredients" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.5H7a1 1 0 00-.7.3L2.8 6.3a1 1 0 000 1.4l9.5 9.5a1 1 0 001.4 0l4.5-4.5a1 1 0 000-1.4L13 2.8A1 1 0 0012 2.5z"/>
            <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
          Ingredients
        </RouterLink>
        <RouterLink to="/recipes" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 2h8l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/>
            <path d="M13 2v4h4"/>
            <path d="M7 9h6M7 12.5h4"/>
          </svg>
          Recipes
        </RouterLink>
        <RouterLink to="/waste" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3.5 6h13M8.5 6V4.5h3V6"/>
            <path d="M5.5 6l.7 10a1 1 0 001 .9h5.6a1 1 0 001-.9L14.5 6"/>
            <path d="M8.5 9.5v4M11.5 9.5v4"/>
          </svg>
          Waste Tracker
        </RouterLink>
        <RouterLink to="/conversions" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 8h12M13 5l3 3-3 3"/>
            <path d="M16 12H4M7 9l-3 3 3 3"/>
          </svg>
          Conversions
        </RouterLink>
        <RouterLink to="/reports" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 16V10M7 16V6M11 16V9M15 16V4"/>
            <path d="M1.5 16h17"/>
          </svg>
          Reports
        </RouterLink>
        <RouterLink to="/settings" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="2.6"/>
            <path d="M10 1.8v2.4M10 15.8v2.4M18.2 10h-2.4M4.2 10H1.8M15.8 4.2l-1.7 1.7M5.9 14.1l-1.7 1.7M15.8 15.8l-1.7-1.7M5.9 5.9L4.2 4.2"/>
          </svg>
          Settings
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <template v-if="authStore.user">
          <div class="sidebar-user">
            <div class="sidebar-user-name" v-if="authStore.businessName">{{ authStore.businessName }}</div>
            <div class="sidebar-user-email">{{ authStore.user.email }}</div>
            <div class="sidebar-user-plan" v-if="authStore.license">
              {{ planLabel(authStore.license.plan_type) }}
              <span v-if="authStore.license.expires_at" class="plan-expiry">
                · exp {{ formatExpiry(authStore.license.expires_at) }}
              </span>
            </div>
          </div>
          <button class="signout-btn" @click="authStore.signOut()">Sign out</button>
        </template>
        <span v-else class="version">Mise v1.0 · CrownWell Labs</span>
      </div>
    </aside>

    <main class="main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

const PLAN_LABELS = {
  solo_lifetime:     'Solo Lifetime',
  business_lifetime: 'Business Lifetime',
  monthly:           'Monthly',
  six_month:         '6-Month',
  yearly:            'Yearly',
  seasonal:          'Seasonal',
}

function planLabel(type) {
  return PLAN_LABELS[type] ?? type
}

function formatExpiry(dt) {
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #0f1117;
  --surface: #1a1d26;
  --surface-2: #22263a;
  --border: #2a2d3e;
  --accent: #f59e0b;
  --text: #f1f5f9;
  --text-muted: #64748b;
  --text-dim: #94a3b8;
  --green: #10b981;
  --red: #ef4444;
  --blue: #3b82f6;
  --radius: 8px;
  --sidebar-width: 220px;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  overflow: hidden;
  height: 100vh;
}

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

::selection { background: rgba(245,158,11,0.25); }

.app { display: flex; height: 100vh; overflow: hidden; }

.sidebar {
  width: var(--sidebar-width);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border-bottom: 1px solid var(--border);
}

.logo-mark {
  width: 32px;
  height: 32px;
  background: var(--accent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.3px;
}

.nav {
  flex: 1;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.15s;
}

.nav-item:hover { background: var(--surface-2); color: var(--text-dim); }

.nav-item.router-link-active {
  background: rgba(245,158,11,0.1);
  color: var(--accent);
  border-left: 2px solid var(--accent);
  padding-left: 8px;
}

.nav-icon { width: 17px; height: 17px; flex-shrink: 0; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.version { font-size: 11px; color: var(--text-muted); }

.sidebar-user { margin-bottom: 8px; }
.sidebar-user-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1px; }
.sidebar-user-email { font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-user-plan { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.plan-expiry { opacity: 0.7; }

.signout-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
}
.signout-btn:hover { background: var(--surface-2); color: var(--red); border-color: rgba(239,68,68,0.3); }

.main { flex: 1; overflow-y: auto; background: var(--bg); }

/* Page transition */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.12s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Layout */
.page { padding: 28px 32px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--text); }
.page-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 3px; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }

.section-header {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.9px;
  margin-bottom: 16px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}
.btn-primary { background: var(--accent); color: #000; }
.btn-primary:hover { background: #d97706; }
.btn-ghost { background: transparent; color: var(--text-dim); border: 1px solid var(--border); }
.btn-ghost:hover { background: var(--surface-2); color: var(--text); }
.btn-danger { background: transparent; color: var(--red); border: 1px solid var(--border); }
.btn-danger:hover { background: rgba(239,68,68,0.1); }

/* Table */
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 13.5px;
}
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: var(--surface-2); transition: background 0.1s; }

/* Forms */
.form-group { margin-bottom: 16px; }
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.form-input, .form-select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 9px 12px;
  color: var(--text);
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus, .form-select:focus { border-color: var(--accent); }
.form-select { cursor: pointer; }

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px;
  width: 460px;
  max-width: 95vw;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}
.modal-title { font-size: 17px; font-weight: 700; margin-bottom: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

/* Stat cards */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; }
.stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text); line-height: 1; }
.stat-sub { font-size: 12px; color: var(--text-muted); margin-top: 6px; }

.stat-icon-box {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.stat-icon-amber { background: rgba(245,158,11,0.15); color: var(--accent); }
.stat-icon-blue { background: rgba(59,130,246,0.15); color: var(--blue); }
.stat-icon-red { background: rgba(239,68,68,0.15); color: var(--red); }
.stat-icon-green { background: rgba(16,185,129,0.15); color: var(--green); }

/* Empty state */
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-state-icon { display: block; margin: 0 auto 14px; opacity: 0.35; }
.empty-state-title { font-size: 15px; font-weight: 600; color: var(--text-dim); margin-bottom: 6px; }
.empty-state-text { font-size: 13px; }

/* Badges */
.badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.badge-green { background: rgba(16,185,129,0.15); color: var(--green); }
.badge-amber { background: rgba(245,158,11,0.15); color: var(--accent); }
.badge-red { background: rgba(239,68,68,0.15); color: var(--red); }

/* Color utilities */
.stat-value-red { color: var(--red); }
.stat-value-green { color: var(--green); }
.stat-value-sm { font-size: 20px; }
</style>
