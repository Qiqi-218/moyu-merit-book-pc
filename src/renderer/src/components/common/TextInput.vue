<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    type?: string
    maxlength?: number
    disabled?: boolean
    invalid?: boolean
    inputId?: string
    describedBy?: string
    autofocus?: boolean
  }>(),
  { placeholder: '', type: 'text', disabled: false, invalid: false, autofocus: false }
)
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void; (event: 'enter'): void }>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    :id="inputId || undefined"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :disabled="disabled"
    :aria-invalid="invalid"
    :aria-describedby="describedBy || undefined"
    :autofocus="autofocus"
    class="text-input"
    :class="{ 'text-input--invalid': invalid }"
    @input="onInput"
    @keydown.enter="emit('enter')"
  />
</template>

<style scoped>
.text-input {
  height: 40px;
  width: 100%;
  padding: 0 var(--sp-3);
  border-radius: var(--r-input);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink);
  font-size: var(--fs-body);
  transition: border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease);
}

.text-input::placeholder {
  color: var(--placeholder);
}

.text-input:hover:not(:disabled) {
  border-color: var(--green-line);
}

.text-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(79, 122, 98, 0.15);
}

.text-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-input--invalid {
  border-color: var(--danger);
}
</style>