<script setup lang="ts">
import { computed } from 'vue'

export interface LineSeries {
  name: string
  color: string
  points: number[]
}

const props = withDefaults(defineProps<{ series: LineSeries[]; labels: string[]; unit?: string }>(), { unit: '分' })

const width = 640
const height = 220
const left = 40
const right = 16
const top = 16
const bottom = 30
const plotW = width - left - right
const plotH = height - top - bottom

const maxValue = computed(() => Math.max(1, ...props.series.flatMap((item) => item.points), 1))
const count = computed(() => Math.max(1, ...props.series.map((item) => item.points.length), props.labels.length))

function xOf(index: number): number {
  return left + (index / Math.max(1, count.value - 1)) * plotW
}

function yOf(value: number): number {
  return top + plotH - (value / maxValue.value) * plotH
}

function linePath(points: number[]): string {
  return points.map((value, index) => `${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`).join(' ')
}

function areaPath(points: number[]): string {
  if (points.length === 0) return ''
  const base = top + plotH
  return `M ${left} ${base} L ${linePath(points).split(' ').join(' L ')} L ${xOf(points.length - 1)} ${base} Z`
}

const lastPoint = computed(() => {
  const index = count.value - 1
  return props.series.map((item) => ({
    name: item.name,
    color: item.color,
    value: item.points[item.points.length - 1] ?? 0,
    x: xOf(index),
    y: yOf(item.points[item.points.length - 1] ?? 0)
  }))
})

const ariaLabel = computed(() => `折线图，${props.series.map((item) => `${item.name} 最新 ${item.points[item.points.length - 1] ?? 0} ${props.unit}`).join('；')}`)

const labelStep = computed(() => (props.labels.length > 40 ? 10 : props.labels.length > 14 ? 4 : 1))
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="line-chart" role="img" :aria-label="ariaLabel" tabindex="0">
    <g>
      <line v-for="ratio in [0, 0.25, 0.5, 0.75, 1]" :key="ratio" :x1="left" :x2="width - right" :y1="top + plotH - ratio * plotH" :y2="top + plotH - ratio * plotH" stroke="var(--line-soft)" stroke-width="1" />
    </g>
    <g v-for="item in series" :key="item.name">
      <path :d="areaPath(item.points)" :fill="item.color" opacity="0.08" />
      <polyline :points="linePath(item.points)" fill="none" :stroke="item.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    </g>
    <g v-for="point in lastPoint" :key="`p-${point.name}`">
      <circle :cx="point.x" :cy="point.y" r="3.5" :fill="point.color" stroke="var(--surface)" stroke-width="1.5">
        <title>{{ point.name }} · {{ point.value }} {{ unit }}</title>
      </circle>
    </g>
    <g>
      <text v-for="(label, index) in labels" v-show="index % labelStep === 0" :key="`l-${index}`" :x="xOf(index)" :y="height - 10" text-anchor="middle" class="line-chart__axis">
        {{ label }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.line-chart {
  width: 100%;
  height: auto;
  display: block;
}

.line-chart__axis {
  fill: var(--muted-2);
  font-size: 11px;
}
</style>