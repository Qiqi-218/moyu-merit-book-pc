<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SealLogo from './SealLogo.vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const app = useAppStore()

const primary = [
  { path: '/', label: '修身', icon: 'home' },
  { path: '/events', label: '修行事项', icon: 'list' },
  { path: '/mind', label: '修心', icon: 'moon' },
  { path: '/records', label: '卷宗', icon: 'book' }
] as const

const secondary = [
  { path: '/timer', label: '番茄钟', icon: 'timer' },
  { path: '/self', label: '灵台', icon: 'user' }
] as const

const version = computed(() => app.version?.appVersion ?? '1.0.0')

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <SealLogo :size="34" />
      <div class="sidebar__brand-text">
        <strong>摸鱼功德簿</strong>
        <span>MOYU MERIT BOOK</span>
      </div>
    </div>

    <nav class="sidebar__nav" aria-label="主导航">
      <RouterLink
        v-for="item in primary"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ 'nav-item--active': isActive(item.path) }"
      >
        <span class="nav-item__icon" aria-hidden="true">
          <svg v-if="item.icon === 'home'" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9.5 10 3l7 6.5" /><path d="M5 8.5V17h10V8.5" />
          </svg>
          <svg v-else-if="item.icon === 'list'" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M4 5.5h12M4 10h12M4 14.5h8" />
          </svg>
          <svg v-else-if="item.icon === 'moon'" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15.5 12.5A6 6 0 0 1 7.5 4.5a6 6 0 1 0 8 8Z" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v13H5.5A1.5 1.5 0 0 0 4 17.5v-13Z" /><path d="M4 16.5A1.5 1.5 0 0 1 5.5 15H16" />
          </svg>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__foot">
      <RouterLink
        v-for="item in secondary"
        :key="item.path"
        :to="item.path"
        class="nav-sub"
        :class="{ 'nav-sub--active': isActive(item.path) }"
      >
        <span aria-hidden="true">
          <svg v-if="item.icon === 'timer'" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="11" r="6.5" /><path d="M10 7.5V11l2.5 1.5" /><path d="M8 2.5h4" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="6.5" r="3" /><path d="M4.5 17c.6-3 2.8-4.5 5.5-4.5S14.9 14 15.5 17" />
          </svg>
        </span>
        {{ item.label }}
      </RouterLink>

      <RouterLink to="/settings" class="nav-sub" :class="{ 'nav-sub--active': route.path === '/settings' }">
        <span aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="2.6" /><path d="M10 3v1.4M10 15.6V17M3 10h1.4M15.6 10H17M4.6 4.6l1 1M14.4 14.4l1 1M15.4 4.6l-1 1M5.6 14.4l-1 1" />
          </svg>
        </span>
        修行设置
      </RouterLink>

      <div class="sidebar__version">版本 {{ version }}</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  flex: 0 0 var(--sidebar-w);
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--sp-5) var(--sp-3) var(--sp-4);
  background: var(--surface-2);
  border-right: 1px solid var(--line-soft);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-2) var(--sp-5);
}

.sidebar__brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.sidebar__brand-text strong {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.sidebar__brand-text span {
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--muted-2);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  position: relative;
  height: 44px;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-3);
  border-radius: var(--r-btn);
  color: var(--text-2);
  font-size: var(--fs-body);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.nav-item:hover {
  background: rgba(79, 122, 98, 0.06);
}

.nav-item--active {
  background: var(--green-soft);
  color: var(--green-deep);
  font-weight: 500;
}

.nav-item--active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 2px;
  background: var(--green);
}

.nav-item__icon {
  display: inline-flex;
  color: currentColor;
}

.sidebar__foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--line-soft);
  padding-top: var(--sp-3);
}

.nav-sub {
  height: 36px;
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 0 var(--sp-3);
  border-radius: var(--r-btn);
  color: var(--muted);
  font-size: var(--fs-note);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.nav-sub:hover {
  background: rgba(79, 122, 98, 0.06);
}

.nav-sub--active {
  color: var(--green-deep);
  background: var(--green-soft);
}

.sidebar__version {
  padding: var(--sp-2) var(--sp-3) 0;
  font-size: var(--fs-micro);
  color: var(--muted-2);
  letter-spacing: 0.04em;
}
</style>