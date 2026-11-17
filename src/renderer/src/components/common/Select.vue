<script setup lang="ts">
export interface SelectOption {
  value: string
  label: string
}

withDefaults(
  defineProps<{ modelValue: string; options: SelectOption[]; disabled?: boolean; invalid?: boolean; selectId?: string; ariaLabel?: string }>(),
  { disabled: false, invalid: false }
)
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="select-wrap">
    <select
      :id="selectId || undefined"
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="invalid"
      :aria-label="ariaLabel || undefined"
      class="select"
      @change="onChange"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <span class="select__arrow" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 4.5 6 7.5l3-3" />
      </svg>
    </span>
  </div>
</template>

<style scoped>
.select-wrap {
  position: relative;
  width: 100%;
}

.select {
  appearance: none;
  height: 40px;
  width: 100%;
  padding: 0 var(--sp-6) 0 var(--sp-3);
  border-radius: var(--r-input);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink);
  font-size: var(--fs-body);
  cursor: pointer;
  transition: border-color var(--t-fast) var(--ease);
}

.select:hover:not(:disabled) {
  border-color: var(--green-line);
}

.select:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(79, 122, 98, 0.15);
}

.select__arrow {
  position: absolute;
  right: var(--sp-3);
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  color: var(--muted);
  pointer-events: none;
}
</style>