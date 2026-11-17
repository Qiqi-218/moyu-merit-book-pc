<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ points: Array<{ mindfulness: number; freedom: number }> }>()

const width = 280
const height = 64
const pad = 4

const max = computed(() => Math.max(1, ...props.points.flatMap((item) => [item.mindfulness, item.freedom])))

function pathOf(key: 'mindfulness' | 'freedom'): string {
  const total = props.points.length
  if (total === 0) return ''
  return props.points
    .map((item, index) => {
      const x = pad + (index / Math.max(1, total - 1)) * (width - pad * 2)
      const y = height - pad - (item[key] / max.value) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const mindfulnessPath = computed(() => pathOf('mindfulness'))
const freedomPath = computed(() => pathOf('freedom'))
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="sparkline" role="img" aria-label="近 14 天正念与逍遥走势">
    <line :x1="pad" :y1="height - pad" :x2="width - pad" :y2="height - pad" stroke="var(--line-soft)" stroke-width="1" />
    <polyline :points="mindfulnessPath" fill="none" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <polyline :points="freedomPath" fill="none" stroke="var(--gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />
  </svg>
</template>

<style scoped>
.sparkline {
  width: 100%;
  height: 64px;
  display: block;
  overflow: visible;
}
</style>