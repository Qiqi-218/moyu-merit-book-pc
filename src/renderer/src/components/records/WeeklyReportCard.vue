<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { formatShortCN } from '@shared/dateUtils'
import { useInsightsStore } from '@/stores/insights'

const insights = useInsightsStore()

const report = computed(() => insights.weekly)
const hasData = computed(() => Boolean(report.value && report.value.days.length > 0))

const chart = computed(() => {
  const days = report.value?.days ?? []
  const width = 300
  const height = 66
  const maxValue = Math.max(1, ...days.map((item) => Math.max(item.mindfulness, item.freedom)))
  const step = days.length > 1 ? width / (days.length - 1) : width
  const pointOf = (value: number, index: number): string => {
    const x = Math.round(index * step)
    const y = Math.round(height - 6 - (value / maxValue) * (height - 14))
    return `${x},${y}`
  }
  return {
    width,
    height,
    mindfulness: days.map((item, index) => pointOf(item.mindfulness, index)).join(' '),
    freedom: days.map((item, index) => pointOf(item.freedom, index)).join(' '),
    labels: days.map((item) => formatShortCN(item.date)),
    dots: days.map((item, index) => ({ x: Math.round(index * step), y: Math.round(height - 6 - (item.mindfulness / maxValue) * (height - 14)) }))
  }
})

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

onMounted(() => {
  void insights.loadWeekly()
})
</script>

<template>
  <section class="weekly-card">
    <header class="weekly-card__head">
      <div>
        <h3 class="weekly-card__title serif">本周修行</h3>
        <p class="weekly-card__range">{{ report ? `${report.startDate} — ${report.endDate}` : '正在整理本周记录…' }}</p>
      </div>
      <div class="weekly-card__legend" aria-hidden="true">
        <span class="weekly-card__legend-item"><i class="weekly-card__swatch weekly-card__swatch--m" />正念</span>
        <span class="weekly-card__legend-item"><i class="weekly-card__swatch weekly-card__swatch--f" />逍遥</span>
      </div>
    </header>

    <template v-if="hasData && report">
      <div class="weekly-card__stats">
        <div class="weekly-card__stat">
          <span class="weekly-card__value mono">{{ report.mindfulnessTotal }}</span>
          <span class="weekly-card__label">正念</span>
        </div>
        <div class="weekly-card__stat">
          <span class="weekly-card__value mono">{{ report.freedomTotal }}</span>
          <span class="weekly-card__label">逍遥</span>
        </div>
        <div class="weekly-card__stat">
          <span class="weekly-card__value mono">{{ report.focusMinutes }}</span>
          <span class="weekly-card__label">专注分钟</span>
        </div>
        <div class="weekly-card__stat">
          <span class="weekly-card__value mono">{{ report.completionRate }}<small>%</small></span>
          <span class="weekly-card__label">完成率</span>
        </div>
      </div>

      <div class="weekly-card__chart">
        <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="本周双值走势">
          <line x1="0" :y1="chart.height - 4" :x2="chart.width" :y2="chart.height - 4" class="weekly-card__axis" />
          <polyline :points="chart.mindfulness" class="weekly-card__line weekly-card__line--m" />
          <polyline :points="chart.freedom" class="weekly-card__line weekly-card__line--f" />
          <circle v-for="(dot, index) in chart.dots" :key="index" :cx="dot.x" :cy="dot.y" r="2" class="weekly-card__dot" />
        </svg>
        <div class="weekly-card__axis-labels">
          <span v-for="(label, index) in chart.labels" :key="index">{{ label }}</span>
        </div>
      </div>

      <div class="weekly-card__grid">
        <div class="weekly-card__panel">
          <h4 class="weekly-card__panel-title">最佳专注时段</h4>
          <p v-if="report.bestHours.length === 0" class="weekly-card__empty">本周还没有专注计时</p>
          <ul v-else class="weekly-card__rows">
            <li v-for="item in report.bestHours" :key="item.hour">
              <span class="mono">{{ hourLabel(item.hour) }}</span>
              <span class="weekly-card__bar"><i :style="{ width: `${Math.min(100, (item.minutes / Math.max(1, report.bestHours[0].minutes)) * 100)}%` }" /></span>
              <span class="weekly-card__row-value mono">{{ item.minutes }} 分</span>
            </li>
          </ul>
        </div>
        <div class="weekly-card__panel">
          <h4 class="weekly-card__panel-title">情绪分布</h4>
          <p v-if="report.emotions.length === 0" class="weekly-card__empty">本周还没有手记</p>
          <div v-else class="weekly-card__emotions">
            <span v-for="item in report.emotions" :key="item.name" class="weekly-card__emotion">
              <span aria-hidden="true">{{ item.emoji }}</span>
              <span>{{ item.name }}</span>
              <b class="mono">{{ item.count }}</b>
            </span>
          </div>
        </div>
      </div>

      <div v-if="report.verdictLines.length > 0" class="weekly-card__verdict">
        <span class="weekly-card__verdict-label">判词摘录</span>
        <p v-for="line in report.verdictLines" :key="line" class="weekly-card__verdict-line serif">{{ line }}</p>
      </div>
    </template>

    <div v-else class="weekly-card__blank">
      <p>本周还没有记录。去立一桩修行，或写一句手记，这里就会慢慢丰盈起来。</p>
    </div>
  </section>
</template>

<style scoped>
.weekly-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-card);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.weekly-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.weekly-card__title {
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.weekly-card__range {
  margin-top: 4px;
  font-size: var(--fs-note);
  color: var(--muted);
  letter-spacing: 0.04em;
}

.weekly-card__legend {
  display: flex;
  gap: var(--sp-3);
  font-size: var(--fs-micro);
  color: var(--muted);
}

.weekly-card__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.weekly-card__swatch {
  width: 10px;
  height: 3px;
  border-radius: 2px;
}

.weekly-card__swatch--m {
  background: var(--green);
}

.weekly-card__swatch--f {
  background: var(--gold);
}

.weekly-card__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-2);
}

.weekly-card__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.weekly-card__value {
  font-size: var(--fs-page);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.1;
}

.weekly-card__value small {
  font-size: var(--fs-note);
  color: var(--muted);
  margin-left: 1px;
}

.weekly-card__label {
  font-size: var(--fs-micro);
  color: var(--muted);
  letter-spacing: 0.06em;
}

.weekly-card__chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.weekly-card__chart svg {
  width: 100%;
  height: 66px;
  overflow: visible;
}

.weekly-card__axis {
  stroke: var(--line);
  stroke-width: 1;
}

.weekly-card__line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.weekly-card__line--m {
  stroke: var(--green);
}

.weekly-card__line--f {
  stroke: var(--gold);
}

.weekly-card__dot {
  fill: var(--surface);
  stroke: var(--green);
  stroke-width: 1.5;
}

.weekly-card__axis-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.weekly-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
}

.weekly-card__panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.weekly-card__panel-title {
  font-size: var(--fs-note);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.06em;
}

.weekly-card__rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: var(--fs-note);
  color: var(--text-2);
}

.weekly-card__rows li {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: var(--sp-2);
}

.weekly-card__bar {
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--line-soft);
  overflow: hidden;
}

.weekly-card__bar i {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--green-line), var(--green));
}

.weekly-card__row-value {
  color: var(--muted);
}

.weekly-card__emotions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.weekly-card__emotion {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--r-pill);
  background: var(--surface);
  border: 1px solid var(--line);
  font-size: var(--fs-note);
  color: var(--text-2);
}

.weekly-card__emotion b {
  color: var(--green-deep);
  font-weight: 600;
}

.weekly-card__verdict {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-btn);
  background: var(--gold-soft);
  border: 1px solid var(--gold);
}

.weekly-card__verdict-label {
  font-size: var(--fs-micro);
  color: var(--gold-deep);
  letter-spacing: 0.1em;
}

.weekly-card__verdict-line {
  font-size: var(--fs-body);
  line-height: 1.8;
  color: var(--ink);
}

.weekly-card__empty {
  font-size: var(--fs-note);
  color: var(--muted-2);
}

.weekly-card__blank {
  padding: var(--sp-5);
  text-align: center;
  font-size: var(--fs-body);
  line-height: 1.9;
  color: var(--muted);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px dashed var(--line);
}
</style>