<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { weekdayIndex } from '@shared/dateUtils'
import { useInsightsStore } from '@/stores/insights'

const insights = useInsightsStore()
const currentYear = new Date().getFullYear()
const year = ref(currentYear)

const LEVEL_GAP = 12

const cells = computed(() => insights.heatmap?.cells ?? [])
const firstWeekday = computed(() => (cells.value.length > 0 ? weekdayIndex(cells.value[0].date) : 0))

const layout = computed(() => {
  const max = insights.heatmap?.max ?? 0
  const levelOf = (total: number): number => {
    if (total <= 0 || max <= 0) return 0
    const ratio = total / max
    if (ratio >= 0.75) return 4
    if (ratio >= 0.5) return 3
    if (ratio >= 0.25) return 2
    return 1
  }
  return cells.value.map((cell, index) => ({
    ...cell,
    x: Math.floor((index + firstWeekday.value) / 7) * LEVEL_GAP,
    y: weekdayIndex(cell.date) * LEVEL_GAP,
    level: levelOf(cell.total)
  }))
})

const chartWidth = computed(() => {
  const columns = layout.value.length > 0 ? Math.max(...layout.value.map((item) => item.x)) : 0
  return columns + 10
})
const chartHeight = 7 * LEVEL_GAP - 2

const milestones = computed(() => {
  const data = insights.heatmap
  return [
    { label: '修行天数', value: data?.activeDays ?? 0, suffix: '天' },
    { label: '当前连续', value: data?.currentStreak ?? 0, suffix: '天' },
    { label: '最长连续', value: data?.longestStreak ?? 0, suffix: '天' },
    { label: '正念合计', value: data?.totalMindfulness ?? 0, suffix: '' },
    { label: '逍遥合计', value: data?.totalFreedom ?? 0, suffix: '' }
  ]
})

function load(): void {
  void insights.loadHeatmap(year.value)
}

function shiftYear(delta: number): void {
  const next = year.value + delta
  if (next < currentYear - 10 || next > currentYear) return
  year.value = next
  load()
}

onMounted(load)
</script>

<template>
  <section class="heat">
    <header class="heat__head">
      <div>
        <h3 class="heat__title serif">年度修行热力图</h3>
        <p class="heat__subtitle">每一天的一点修行，连起来就是一年</p>
      </div>
      <div class="heat__year">
        <button type="button" class="heat__nav" aria-label="上一年" @click="shiftYear(-1)">‹</button>
        <span class="heat__year-label mono">{{ year }}</span>
        <button type="button" class="heat__nav" aria-label="下一年" :disabled="year >= currentYear" @click="shiftYear(1)">›</button>
      </div>
    </header>

    <div class="heat__body">
      <div class="heat__chart-wrap">
        <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="heat__chart" role="img" :aria-label="`${year} 年每日修行热力图`">
          <rect
            v-for="cell in layout"
            :key="cell.date"
            :x="cell.x"
            :y="cell.y"
            width="9"
            height="9"
            rx="2"
            :class="['heat__cell', `heat__cell--${cell.level}`]"
          >
            <title>{{ cell.date }} · 正念 {{ cell.mindfulness }} · 逍遥 {{ cell.freedom }}</title>
          </rect>
        </svg>
      </div>

      <div class="heat__legend">
        <span>少</span>
        <i class="heat__swatch heat__swatch--0" />
        <i class="heat__swatch heat__swatch--1" />
        <i class="heat__swatch heat__swatch--2" />
        <i class="heat__swatch heat__swatch--3" />
        <i class="heat__swatch heat__swatch--4" />
        <span>多</span>
      </div>
    </div>

    <div class="heat__milestones">
      <div v-for="item in milestones" :key="item.label" class="heat__milestone">
        <span class="heat__milestone-value mono">{{ item.value }}<small v-if="item.suffix">{{ item.suffix }}</small></span>
        <span class="heat__milestone-label">{{ item.label }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.heat {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-card);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.heat__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.heat__title {
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.heat__subtitle {
  margin-top: 4px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.heat__year {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.heat__nav {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: var(--green-deep);
  font-size: 16px;
  line-height: 1;
  transition: background var(--t-fast) var(--ease);
}

.heat__nav:hover:not(:disabled) {
  background: var(--green-soft);
}

.heat__nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.heat__year-label {
  font-size: var(--fs-note);
  color: var(--ink);
  letter-spacing: 0.08em;
}

.heat__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.heat__chart-wrap {
  overflow-x: auto;
}

.heat__chart {
  width: 100%;
  min-width: 620px;
  height: 84px;
}

.heat__cell {
  fill: var(--line-soft);
}

.heat__cell--0 {
  fill: var(--line-soft);
}

.heat__cell--1 {
  fill: var(--green-soft);
}

.heat__cell--2 {
  fill: var(--green-line);
}

.heat__cell--3 {
  fill: var(--green);
}

.heat__cell--4 {
  fill: var(--green-deep);
}

.heat__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.heat__legend i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 2px;
}

.heat__swatch--0 {
  background: var(--line-soft);
}

.heat__swatch--1 {
  background: var(--green-soft);
}

.heat__swatch--2 {
  background: var(--green-line);
}

.heat__swatch--3 {
  background: var(--green);
}

.heat__swatch--4 {
  background: var(--green-deep);
}

.heat__milestones {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--sp-2);
}

.heat__milestone {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.heat__milestone-value {
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
}

.heat__milestone-value small {
  font-size: var(--fs-micro);
  color: var(--muted);
  margin-left: 1px;
}

.heat__milestone-label {
  font-size: var(--fs-micro);
  color: var(--muted);
  letter-spacing: 0.06em;
}
</style>