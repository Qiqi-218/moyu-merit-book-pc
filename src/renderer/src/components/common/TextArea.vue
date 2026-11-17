<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    maxlength?: number
    rows?: number
    invalid?: boolean
    describedBy?: string
    disabled?: boolean
  }>(),
  { placeholder: '', rows: 4, invalid: false, disabled: false }
)
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :rows="rows"
    :disabled="disabled"
    :aria-invalid="invalid"
    :aria-describedby="describedBy || undefined"
    class="text-area"
    :class="{ 'text-area--invalid': invalid }"
    @input="onInput"
  />
</template>

<style scoped>
.text-area {
  width: 100%;
  min-height: 120px;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-input);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink);
  font-size: var(--fs-body);
  line-height: 1.7;
  resize: vertical;
  transition: border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease);
}

.text-area::placeholder {
  color: var(--placeholder);
}

.text-area:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(79, 122, 98, 0.15);
}

.text-area--invalid {
  border-color: var(--danger);
}
</style>