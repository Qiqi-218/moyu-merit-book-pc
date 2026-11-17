<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ slices: Array<{ label: string; value: number; color: string }>; centerLabel?: string }>(), {
  centerLabel: '总篇数'
})

const radius = 54
const circumference = 2 * Math.PI * radius
const total = computed(() => props.slices.reduce((sum, item) => sum + item.value, 0))

const segments = computed(() => {
  let offset = 0
  return props.slices.map((item) => {
    const length = total.value > 0 ? (item.value / total.value) * circumference : 0
    const segment = {
      ...item,
      dash: `${length} ${circumference - length}`,
      offset
    }
    offset += length
    return segment
  })
})

const ariaLabel = computed(() => `环形图，共 ${total.value} 篇；${props.slices.map((item) => `${item.label} ${item.value} 篇`).join('，')}`)
</script>

<template>
  <svg viewBox="0 0 160 160" class="donut" role="img" :aria-label="ariaLabel" tabindex="0">
    <circle cx="80" cy="80" :r="radius" fill="none" stroke="var(--line-soft)" stroke-width="16" />
    <circle
      v-for="segment in segments"
      :key="segment.label"
      cx="80"
      cy="80"
      :r="radius"
      fill="none"
      :stroke="segment.color"
      stroke-width="16"
      :stroke-dasharray="segment.dash"
      :stroke-dashoffset="-segment.offset"
      transform="rotate(-90 80 80)"
      stroke-linecap="butt"
    >
      <title>{{ segment.label }} · {{ segment.value }}</title>
    </circle>
    <text x="80" y="76" text-anchor="middle" class="donut__total">{{ total }}</text>
    <text x="80" y="94" text-anchor="middle" class="donut__label">{{ centerLabel }}</text>
  </svg>
</template>

<style scoped>
.donut {
  width: 200px;
  height: 200px;
  display: block;
}

.donut__total {
  font-family: var(--font-serif);
  font-size: 26px;
  fill: var(--ink);
  font-weight: 600;
}

.donut__label {
  font-size: 11px;
  fill: var(--muted);
}
</style>