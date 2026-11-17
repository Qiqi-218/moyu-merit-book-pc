<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ data: Array<{ label: string; value: number }>; yMax?: number; unit?: string }>(), {
  yMax: 6,
  unit: '小时'
})

const width = 640
const height = 220
const left = 40
const right = 12
const top = 16
const bottom = 30
const plotW = width - left - right
const plotH = height - top - bottom
const maxValue = computed(() => Math.max(props.yMax, 1, ...props.data.map((item) => item.value)))
const barWidth = 18

const bars = computed(() =>
  props.data.map((item, index) => {
    const slot = plotW / Math.max(1, props.data.length)
    const x = left + slot * index + (slot - barWidth) / 2
    const barHeight = Math.max(item.value > 0 ? 2 : 0, (item.value / maxValue.value) * plotH)
    const y = top + plotH - barHeight
    return { ...item, x, y, barHeight }
  })
)

const labelStep = computed(() => (props.data.length > 40 ? 10 : props.data.length > 14 ? 4 : 1))

const gridLines = computed(() => {
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return ticks.map((ratio) => ({
    y: top + plotH - ratio * plotH,
    label: Math.round(maxValue.value * ratio * 10) / 10
  }))
})

const ariaLabel = computed(() => {
  const total = props.data.reduce((sum, item) => sum + item.value, 0)
  return `柱状图，共 ${props.data.length} 个数据点，合计 ${Math.round(total * 10) / 10} ${props.unit}`
})
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="bar-chart" role="img" :aria-label="ariaLabel" tabindex="0">
    <g>
      <line
        v-for="line in gridLines"
        :key="line.label"
        :x1="left"
        :x2="width - right"
        :y1="line.y"
        :y2="line.y"
        stroke="var(--line-soft)"
        stroke-width="1"
      />
      <text v-for="line in gridLines" :key="`t-${line.label}`" :x="left - 8" :y="line.y + 4" text-anchor="end" class="bar-chart__axis">
        {{ line.label }}
      </text>
    </g>
    <g>
      <rect
        v-for="bar in bars"
        :key="bar.label"
        :x="bar.x"
        :y="bar.y"
        :width="barWidth"
        :height="bar.barHeight"
        rx="4"
        fill="var(--green)"
        :opacity="0.35 + (bar.value / maxValue) * 0.6"
      >
        <title>{{ bar.label }} · {{ bar.value }} {{ unit }}</title>
      </rect>
    </g>
    <g>
      <text
        v-for="(bar, index) in bars"
        v-show="index % labelStep === 0"
        :key="`x-${bar.label}`"
        :x="bar.x + barWidth / 2"
        :y="height - 10"
        text-anchor="middle"
        class="bar-chart__axis"
      >
        {{ bar.label }}
      </text>
    </g>
    <line :x1="left" :x2="width - right" :y1="top + plotH" :y2="top + plotH" stroke="var(--line)" stroke-width="1" />
  </svg>
</template>

<style scoped>
.bar-chart {
  width: 100%;
  height: auto;
  display: block;
}

.bar-chart__axis {
  fill: var(--muted-2);
  font-size: 11px;
  font-family: var(--font-sans);
}
</style>