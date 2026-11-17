<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SealLogo from './SealLogo.vue'

const maximized = ref(false)
let off: (() => void) | null = null

async function minimize(): Promise<void> {
  await window.moyu.window.minimize()
}

async function toggle(): Promise<void> {
  const result = await window.moyu.window.toggleMaximize()
  if (result.ok) maximized.value = result.data.maximized
}

async function close(): Promise<void> {
  await window.moyu.window.close()
}

onMounted(() => {
  off = window.moyu.on.windowState((state) => {
    maximized.value = state.maximized
  })
})

onUnmounted(() => {
  off?.()
})
</script>

<template>
  <header class="titlebar drag-region">
    <div class="titlebar__left">
      <SealLogo :size="20" />
      <span class="titlebar__name">摸鱼功德簿</span>
    </div>
    <div class="titlebar__right no-drag">
      <button type="button" class="titlebar__btn" aria-label="最小化窗口" @click="minimize">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
      </button>
      <button type="button" class="titlebar__btn" :aria-label="maximized ? '还原窗口' : '最大化窗口'" @click="toggle">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>
      </button>
      <button type="button" class="titlebar__btn titlebar__btn--close" aria-label="关闭窗口" @click="close">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: var(--sp-3);
  background: var(--surface-2);
  border-bottom: 1px solid var(--line-soft);
  user-select: none;
}

.titlebar__left {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  color: var(--muted);
}

.titlebar__name {
  font-family: var(--font-serif);
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  color: var(--muted);
}

.titlebar__right {
  display: flex;
  height: 100%;
}

.titlebar__btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
  border-radius: 0;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.titlebar__btn:hover {
  background: rgba(79, 122, 98, 0.08);
}

.titlebar__btn--close:hover {
  background: var(--danger);
  color: var(--surface);
}
</style>