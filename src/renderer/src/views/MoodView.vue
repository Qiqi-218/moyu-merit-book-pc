<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useInsightsStore } from '@/stores/insights'
import { formatDateCN, formatShortCN } from '@shared/dateUtils'
import { INTENSITY_LABEL } from '@shared/constants'

const router = useRouter()
const insights = useInsightsStore()

const report = computed(() => insights.mood)
const hasEntries = computed(() => Boolean(report.value && report.value.totalEntries > 0))
const days = computed(() => report.value?.days ?? [])

const chart = computed(() => {
  const width = 600
  const height = 140
  const points = days.value
  const step = points.length > 0 ? width / points.length : width
  const barWidth = Math.max(3, step * 0.62)
  const bars = points.map((point, index) => {
    const ratio = Math.min(1, Math.max(0, point.intensity / 5))
    const barHeight = Math.round(ratio * (height - 20))
    return {
      date: point.date,
      x: Math.round(index * step + (step - barWidth) / 2),
      y: height - barHeight - 8,
      width: Math.round(barWidth),
      height: Math.max(point.count > 0 ? 3 : 0, barHeight),
      active: point.count > 0,
      ratio
    }
  })
  const labelStep = Math.max(1, Math.floor(points.length / 5))
  const labels = points
    .map((point, index) => ({ date: point.date, index }))
    .filter((item) => item.index % labelStep === 0 || item.index === points.length - 1)
    .map((item) => ({ text: formatShortCN(item.date), x: Math.round(item.index * step + step / 2) }))
  return { width, height, bars, labels }
})

const distributionTotal = computed(() => report.value?.distribution.reduce((sum, item) => sum + item.count, 0) ?? 0)

function percentOf(count: number): number {
  if (distributionTotal.value <= 0) return 0
  return Math.round((count / distributionTotal.value) * 100)
}

function intensityDots(value: number): number[] {
  return [1, 2, 3, 4, 5].map((level) => (value >= level ? 1 : 0))
}

function openDiary(id: string): void {
  void router.push(`/mind/diary/${id}`)
}

function writeDiary(): void {
  void router.push('/mind/diary/new')
}

onMounted(() => {
  void insights.loadMood(30)
})
</script>

<template>
  <div class="mood-view">
    <PageHeader title="情绪日记" subtitle="记录情绪，也看见自己的节奏">
      <template #actions>
        <AppButton size="sm" @click="writeDiary">记一笔</AppButton>
      </template>
    </PageHeader>

    <div class="mood-grid">
      <SectionCard title="近 30 天情绪强度" subtitle="柱越高，那天的情绪越浓">
        <template #actions>
          <span class="mood-meta" v-if="report">
            记录 <b>{{ report.activeDays }}</b> 天 · 共 <b>{{ report.totalEntries }}</b> 篇 · 平均 <b>{{ report.averageIntensity }}</b>
          </span>
        </template>
        <div v-if="hasEntries" class="mood-chart">
          <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="近 30 天情绪强度">
            <line x1="0" :y1="chart.height - 8" :x2="chart.width" :y2="chart.height - 8" class="mood-chart__axis" />
            <g v-for="(bar, index) in chart.bars" :key="index">
              <rect
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                rx="2"
                class="mood-chart__bar"
                :class="{ 'mood-chart__bar--active': bar.active }"
                :opacity="bar.active ? 0.35 + bar.ratio * 0.65 : 0.12"
              >
                <title>{{ bar.date }} · 强度 {{ bar.active ? bar.ratio * 5 : 0 }}</title>
              </rect>
            </g>
          </svg>
          <div class="mood-chart__labels">
            <span v-for="label in chart.labels" :key="label.text + label.x" :style="{ left: `${(label.x / chart.width) * 100}%` }">{{ label.text }}</span>
          </div>
        </div>
        <EmptyState v-else title="这三十天还没有情绪记录" desc="写下第一句手记，情绪就开始有了形状。" />
      </SectionCard>

      <SectionCard title="情绪占比" subtitle="这段时间里，你更常处在哪种心情">
        <div v-if="hasEntries && (report?.distribution.length ?? 0) > 0" class="mood-dist">
          <div v-for="item in report?.distribution" :key="item.tagId" class="mood-dist__row">
            <span class="mood-dist__emoji" aria-hidden="true">{{ item.emoji }}</span>
            <div class="mood-dist__main">
              <div class="mood-dist__top">
                <span class="mood-dist__name">{{ item.name }}</span>
                <span class="mood-dist__count mono">{{ item.count }} · {{ percentOf(item.count) }}%</span>
              </div>
              <div class="mood-dist__bar"><i :style="{ width: `${percentOf(item.count)}%` }" /></div>
            </div>
          </div>
        </div>
        <EmptyState v-else title="暂无情绪分布" desc="记录时选择一个情绪，这里会慢慢长成你的样子。" />
      </SectionCard>
    </div>

    <SectionCard title="情绪日记" subtitle="按日回看，每一次心情都有出处">
      <template #actions>
        <span v-if="report" class="mood-meta">{{ report.startDate }} — {{ report.endDate }}</span>
      </template>
      <div v-if="hasEntries" class="mood-list">
        <button v-for="item in report?.items" :key="item.id" type="button" class="mood-item" @click="openDiary(item.id)">
          <div class="mood-item__head">
            <span class="mood-item__date">{{ formatDateCN(item.date) }}</span>
            <span class="mood-item__tag">{{ item.emoji }} {{ item.tagName }}</span>
          </div>
          <p class="mood-item__preview">{{ item.preview }}</p>
          <div class="mood-item__foot">
            <span class="mood-item__dots" aria-hidden="true">
              <i v-for="(dot, index) in intensityDots(item.intensity)" :key="index" :class="{ 'mood-item__dot--on': dot === 1 }" class="mood-item__dot" />
            </span>
            <span class="mood-item__level">{{ INTENSITY_LABEL[item.intensity as 1 | 2 | 3 | 4 | 5] ?? '' }}</span>
          </div>
        </button>
      </div>
      <EmptyState v-else title="还没有情绪日记" desc="点右上角「记一笔」，写下此刻的心情。" />
    </SectionCard>
  </div>
</template>

<style scoped>
.mood-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.mood-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: var(--sp-4);
}

.mood-meta {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.mood-meta b {
  color: var(--green-deep);
  font-weight: 600;
}

.mood-chart {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.mood-chart svg {
  width: 100%;
  height: 150px;
  overflow: visible;
}

.mood-chart__axis {
  stroke: var(--line);
  stroke-width: 1;
}

.mood-chart__bar {
  fill: var(--green-line);
  transition: opacity var(--t-fast) var(--ease);
}

.mood-chart__bar--active {
  fill: var(--green);
}

.mood-chart__labels {
  position: relative;
  height: 14px;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.mood-chart__labels span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.mood-dist {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.mood-dist__row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.mood-dist__emoji {
  font-size: 20px;
  width: 26px;
  text-align: center;
}

.mood-dist__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mood-dist__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

.mood-dist__name {
  font-size: var(--fs-body);
  color: var(--ink);
}

.mood-dist__count {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.mood-dist__bar {
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--line-soft);
  overflow: hidden;
}

.mood-dist__bar i {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--green-line), var(--green));
}

.mood-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--sp-3);
}

.mood-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  border: 1px solid var(--line-soft);
  background: var(--surface-2);
  text-align: left;
  transition: border-color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease);
}

.mood-item:hover {
  border-color: var(--green-line);
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}

.mood-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.mood-item__date {
  font-size: var(--fs-note);
  color: var(--muted);
}

.mood-item__tag {
  font-size: var(--fs-micro);
  color: var(--green-deep);
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: var(--green-soft);
}

.mood-item__preview {
  font-size: var(--fs-body);
  line-height: 1.7;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mood-item__foot {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.mood-item__dots {
  display: inline-flex;
  gap: 3px;
}

.mood-item__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line);
}

.mood-item__dot--on {
  background: var(--green);
}

.mood-item__level {
  font-size: var(--fs-micro);
  color: var(--muted);
}

@media (max-width: 960px) {
  .mood-grid {
    grid-template-columns: 1fr;
  }
}
</style>