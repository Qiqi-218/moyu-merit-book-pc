<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'sample' | 'green' | 'gold' | 'danger' | 'muted' }>(), { variant: 'muted' })
</script>

<template>
  <span class="badge" :class="`badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 9px;
  border-radius: var(--r-pill);
  font-size: var(--fs-micro);
  line-height: 1.7;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.badge--sample {
  background: var(--gold-soft);
  color: var(--gold-deep);
}

.badge--green {
  background: var(--green-soft);
  color: var(--green-deep);
}

.badge--gold {
  background: var(--gold-soft);
  color: var(--gold-deep);
}

.badge--danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.badge--muted {
  background: var(--surface-2);
  color: var(--muted);
  border: 1px solid var(--line-soft);
}
</style>