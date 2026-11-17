<script setup lang="ts">
export interface SegmentedOption {
  value: string
  label: string
  count?: number
}

defineProps<{ modelValue: string; options: SegmentedOption[]; ariaLabel?: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div class="segmented" role="tablist" :aria-label="ariaLabel ?? '分段选择'">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      class="segmented__item"
      :class="{ 'segmented__item--active': option.value === modelValue }"
      :aria-selected="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="segmented__count">{{ option.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.segmented__item {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: 8px;
  color: var(--text-2);
  font-size: var(--fs-note);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.segmented__item:hover {
  color: var(--green-deep);
}

.segmented__item--active {
  background: var(--green-soft);
  color: var(--green-deep);
  font-weight: 500;
}

.segmented__count {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.segmented__item--active .segmented__count {
  color: var(--green-deep);
  opacity: 0.8;
}
</style>