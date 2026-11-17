<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="false">
    <div v-for="item in ui.toasts" :key="item.id" class="toast" :class="`toast--${item.kind}`" role="status">
      <div class="toast__message">{{ item.message }}</div>
      <div v-if="item.hint" class="toast__hint">{{ item.hint }}</div>
    </div>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: calc(var(--titlebar-h) + 16px);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  align-items: center;
  pointer-events: none;
}

.toast {
  min-width: 240px;
  max-width: 460px;
  padding: 10px 18px;
  border-radius: var(--r-pill);
  background: var(--ink);
  color: var(--surface);
  box-shadow: var(--shadow-pop);
  animation: toast-in var(--t-base) var(--ease);
}

.toast--success {
  background: var(--green-deep);
}

.toast--error {
  background: var(--danger);
}

.toast__message {
  font-size: var(--fs-note);
  letter-spacing: 0.02em;
}

.toast__hint {
  margin-top: 2px;
  font-size: var(--fs-micro);
  opacity: 0.75;
}
</style>