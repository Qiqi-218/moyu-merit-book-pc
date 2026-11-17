<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{ title?: string; width?: number; closable?: boolean }>(), {
  title: '',
  width: 480,
  closable: true
})
const emit = defineEmits<{ (event: 'close'): void }>()
const panel = ref<HTMLElement | null>(null)
let previous: HTMLElement | null = null

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.closable) emit('close')
}

onMounted(() => {
  previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.addEventListener('keydown', onKeydown)
  window.setTimeout(() => panel.value?.focus(), 0)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  previous?.focus()
})
</script>

<template>
  <div class="modal-overlay" @click.self="closable && emit('close')">
    <div
      ref="panel"
      class="modal-panel"
      role="dialog"
      aria-modal="true"
      :aria-label="title || '弹窗'"
      tabindex="-1"
      :style="{ width: `${width}px` }"
    >
      <header v-if="title || closable" class="modal-head">
        <h2 class="card-title">{{ title }}</h2>
        <button v-if="closable" type="button" class="modal-close" aria-label="关闭弹窗" @click="emit('close')">×</button>
      </header>
      <div class="modal-body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="modal-foot">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--overlay);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
}

.modal-panel {
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-pop);
  overflow: hidden;
  animation: fade-in var(--t-base) var(--ease);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5) var(--sp-2);
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--muted);
  font-size: 18px;
}

.modal-close:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.modal-body {
  padding: var(--sp-2) var(--sp-5) var(--sp-4);
  overflow-y: auto;
  color: var(--text-2);
  font-size: var(--fs-body);
  line-height: 1.7;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5) var(--sp-5);
}
</style>