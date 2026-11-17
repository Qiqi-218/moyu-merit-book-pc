<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; art?: 'cup' | 'scroll' | 'chart' | 'leaf' | 'seal' }>(), {
  description: '',
  art: 'cup'
})
</script>

<template>
  <div class="empty">
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="art === 'cup'">
        <path d="M28 46h36v14a18 18 0 0 1-36 0V46Z" />
        <path d="M64 50h6a8 8 0 0 1 0 16h-6" />
        <path d="M24 74h44" />
        <path d="M42 36c0-6 4-8 4-12M52 36c0-6 4-8 4-12" opacity="0.5" />
      </template>
      <template v-else-if="art === 'scroll'">
        <rect x="26" y="24" width="44" height="48" rx="4" />
        <path d="M34 38h28M34 48h28M34 58h18" opacity="0.6" />
        <circle cx="66" cy="70" r="10" opacity="0.4" />
      </template>
      <template v-else-if="art === 'chart'">
        <path d="M24 72V24M24 72h48" />
        <rect x="34" y="52" width="8" height="20" rx="2" opacity="0.5" />
        <rect x="48" y="42" width="8" height="30" rx="2" opacity="0.7" />
        <rect x="62" y="34" width="8" height="38" rx="2" opacity="0.4" />
      </template>
      <template v-else-if="art === 'leaf'">
        <path d="M64 30C46 30 34 44 34 60c16 0 30-12 30-30Z" />
        <path d="M64 30c-10 12-18 22-30 30" opacity="0.6" />
        <path d="M26 70c10-2 18-8 24-18" opacity="0.4" />
      </template>
      <template v-else>
        <rect x="28" y="28" width="40" height="40" rx="3" />
        <path d="M38 40h20M38 48h20M38 56h12" opacity="0.5" />
      </template>
    </svg>
    <div class="empty__title serif">{{ title }}</div>
    <p v-if="description" class="empty__desc">{{ description }}</p>
    <div class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--sp-6) var(--sp-4);
  color: var(--green-line);
}

.empty__title {
  margin-top: var(--sp-3);
  font-size: var(--fs-card);
  color: var(--ink);
  font-weight: 600;
}

.empty__desc {
  margin-top: var(--sp-1);
  font-size: var(--fs-note);
  color: var(--muted);
  max-width: 420px;
  line-height: 1.7;
}

.empty__actions {
  margin-top: var(--sp-4);
  display: flex;
  gap: var(--sp-2);
}
</style>