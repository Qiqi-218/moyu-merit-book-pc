<script setup lang="ts">
defineProps<{ label: string; active?: boolean }>()
</script>

<template>
  <span class="tag-chip" :class="{ 'tag-chip--active': active }">{{ label }}</span>
</template>

<style scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 10px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: var(--fs-micro);
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.tag-chip--active {
  background: var(--green-soft);
  border-color: var(--green-line);
  color: var(--green-deep);
}
</style>