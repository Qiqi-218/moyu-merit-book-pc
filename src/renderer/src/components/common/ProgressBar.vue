<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ value: number; color?: 'green' | 'gold' | 'muted'; height?: number }>(), {
  color: 'green',
  height: 6
})

const width = computed(() => `${Math.round(Math.max(0, Math.min(1, props.value)) * 100)}%`)
const percent = computed(() => Math.round(Math.max(0, Math.min(1, props.value)) * 100))
</script>

<template>
  <div
    class="progress"
    :style="{ height: `${height}px` }"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <span class="progress__fill" :class="`progress__fill--${color}`" :style="{ width }" />
  </div>
</template>

<style scoped>
.progress {
  width: 100%;
  background: var(--line-soft);
  border-radius: var(--r-pill);
  overflow: hidden;
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  transition: width var(--t-progress) var(--ease);
}

.progress__fill--green {
  background: var(--green);
}

.progress__fill--gold {
  background: var(--gold);
}

.progress__fill--muted {
  background: var(--muted-2);
}
</style>