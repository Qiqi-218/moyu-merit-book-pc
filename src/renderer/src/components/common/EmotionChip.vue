<script setup lang="ts">
defineProps<{
  emoji: string
  name: string
  color: string
  softColor: string
  active?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ (event: 'select'): void }>()
</script>

<template>
  <button
    type="button"
    class="emotion-chip"
    :class="{ 'emotion-chip--active': active }"
    :style="active ? { color, borderColor: color, background: softColor } : { color }"
    :aria-pressed="active"
    :disabled="disabled"
    @click="emit('select')"
  >
    <span class="emotion-chip__emoji" aria-hidden="true">{{ emoji }}</span>
    <span>{{ name }}</span>
  </button>
</template>

<style scoped>
.emotion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: var(--fs-note);
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
}

.emotion-chip:hover:not(:disabled) {
  border-color: currentColor;
}

.emotion-chip:active:not(:disabled) {
  transform: scale(0.98);
}

.emotion-chip--active {
  border-width: 1.5px;
  font-weight: 500;
}

.emotion-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.emotion-chip__emoji {
  font-size: 15px;
}
</style>