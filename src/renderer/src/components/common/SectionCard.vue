<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string }>(), { title: '', subtitle: '' })
</script>

<template>
  <section class="section-card">
    <header v-if="title || $slots.actions" class="section-card__head">
      <div>
        <h2 class="card-title">{{ title }}</h2>
        <p v-if="subtitle" class="section-card__sub">{{ subtitle }}</p>
      </div>
      <div class="section-card__actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.section-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: var(--sp-5);
  box-shadow: var(--shadow-card);
}

.section-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.section-card__sub {
  margin-top: 2px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.section-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}
</style>