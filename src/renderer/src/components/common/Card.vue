<script setup lang="ts">
withDefaults(defineProps<{ flush?: boolean }>(), { flush: false })
</script>

<template>
  <div class="card" :class="{ 'card--flush': flush }">
    <slot />
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: var(--sp-5);
  box-shadow: var(--shadow-card);
}

.card--flush {
  padding: 0;
  overflow: hidden;
}
</style>