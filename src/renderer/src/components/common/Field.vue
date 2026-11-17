<script setup lang="ts">
withDefaults(defineProps<{ label: string; hint?: string; error?: string; required?: boolean; forId?: string }>(), {
  hint: '',
  error: '',
  required: false,
  forId: ''
})
</script>

<template>
  <div class="field">
    <label class="field__label" :for="forId || undefined">
      <span>{{ label }}</span>
      <span v-if="required" class="field__required">必填</span>
    </label>
    <slot />
    <p v-if="error" class="field__error" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.field__required {
  font-size: var(--fs-micro);
  color: var(--danger);
}

.field__error {
  font-size: var(--fs-micro);
  color: var(--danger);
}

.field__hint {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}
</style>