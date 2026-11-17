<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'ghost' | 'danger' | 'text' | 'secondary'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: 'md' | 'sm'
    block?: boolean
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', block: false, disabled: false, loading: false, type: 'button' }
)

const emit = defineEmits<{ (event: 'click', value: MouseEvent): void }>()

const classes = computed(() => [
  'app-btn',
  `app-btn--${props.variant}`,
  `app-btn--${props.size}`,
  { 'app-btn--block': props.block, 'app-btn--loading': props.loading }
])

function handleClick(event: MouseEvent): void {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span v-if="loading" class="app-btn__dot" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  height: 40px;
  padding: 0 var(--sp-4);
  border-radius: var(--r-pill);
  font-size: var(--fs-body);
  letter-spacing: 0.02em;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease);
  white-space: nowrap;
}

.app-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-btn--primary {
  background: var(--green);
  color: var(--surface);
}

.app-btn--primary:hover:not(:disabled) {
  background: var(--green-deep);
}

.app-btn--secondary {
  background: var(--surface-2);
  color: var(--green-deep);
  border: 1px solid var(--line);
}

.app-btn--secondary:hover:not(:disabled) {
  border-color: var(--green-line);
}

.app-btn--ghost {
  background: transparent;
  color: var(--green-deep);
  border: 1px solid var(--green-line);
}

.app-btn--ghost:hover:not(:disabled) {
  background: var(--green-soft);
}

.app-btn--danger {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger-line);
}

.app-btn--danger:hover:not(:disabled) {
  background: var(--danger-soft);
}

.app-btn--text {
  background: transparent;
  color: var(--text-2);
  padding: 0 var(--sp-2);
}

.app-btn--text:hover:not(:disabled) {
  color: var(--green-deep);
}

.app-btn--sm {
  height: 32px;
  padding: 0 var(--sp-3);
  font-size: var(--fs-note);
}

.app-btn--block {
  width: 100%;
}

.app-btn__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
</style>