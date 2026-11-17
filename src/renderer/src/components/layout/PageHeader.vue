<script setup lang="ts">
import { useRouter } from 'vue-router'

withDefaults(defineProps<{ title: string; subtitle?: string; back?: boolean }>(), { subtitle: '', back: false })

const router = useRouter()

function goBack(): void {
  router.back()
}
</script>

<template>
  <header class="page-header">
    <div class="page-header__left">
      <button v-if="back" type="button" class="back-btn" aria-label="返回上一页" @click="goBack">‹ 返回</button>
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-header__sub">{{ subtitle }}</p>
      </div>
    </div>
    <div class="page-header__actions">
      <slot name="actions" />
      <slot />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: 0 var(--content-pad);
  background: linear-gradient(180deg, var(--bg) 62%, rgba(244, 240, 230, 0));
}

:global([data-theme="night"]) .page-header {
  background: linear-gradient(180deg, var(--bg) 62%, rgba(30, 36, 32, 0));
}

.page-header__left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.page-header__sub {
  margin-top: 2px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.back-btn {
  height: 32px;
  padding: 0 var(--sp-2);
  border-radius: var(--r-btn);
  color: var(--text-2);
  font-size: var(--fs-note);
}

.back-btn:hover {
  background: var(--green-soft);
  color: var(--green-deep);
}
</style>