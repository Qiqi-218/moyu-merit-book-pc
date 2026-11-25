<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import YearHeatmap from '@/components/records/YearHeatmap.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Segmented from '@/components/common/Segmented.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useAppStore } from '@/stores/app'
import { useRecordsStore } from '@/stores/records'
import type { TrendKind } from '@shared/types/dto'
import { addDays, daysBetween, formatShortCN, weekdayCN } from '@shared/dateUtils'

const app = useAppStore()
const records = useRecordsStore()

const today = computed(() => app.today?.businessDate ?? new Date().toISOString().slice(0, 10))
const range = ref('7')
const start = ref(addDays(today.value, -6))
const end = ref(today.value)
const customStart = ref(addDays(today.value, -6))
const customEnd = ref(today.value)
const activeTab = ref<TrendKind>('focus')
const rangeError = ref('')

const rangeOptions = [
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
  { value: '90', label: '近 90 天' },
  { value: 'custom', label: '自定义' }
]

const tabOptions = [
  { value: 'focus', label: '专注趋势' },
  { value: 'rest', label: '休息趋势' },
  { value: 'emotion', label: '情绪趋势' },
  { value: 'values', label: '双值趋势' }
]

const trend = computed(() => records.trend)

const barData = computed(() =>
  (trend.value?.points ?? []).map((point) => ({
    label: point.date,
    value: point.value
  }))
)

const lineLabels = computed(() =>
  (trend.value?.points ?? []).map((point) => (daysBetween(start.value, end.value) <= 13 ? weekdayCN(point.date) : formatShortCN(point.date)))
)

const emotionLabels = computed(() => (trend.value?.intensityPoints ?? []).map((point) => formatShortCN(point.date)))

const valueSeries = computed(() => {
  const series = trend.value?.valueSeries
  if (!series) return []
  return [
    { name: '正念', color: 'var(--green)', points: series.mindfulness.map((item) => item.value) },
    { name: '逍遥', color: 'var(--gold)', points: series.freedom.map((item) => item.value) }
  ]
})

function applyRange(): void {
  rangeError.value = ''
  if (range.value === 'custom') {
    const span = daysBetween(customStart.value, customEnd.value)
    if (span < 0) {
      rangeError.value = '结束日期不能早于开始日期'
      return
    }
    if (span > 366) {
      rangeError.value = '区间最长 366 天'
      return
    }
    start.value = customStart.value
    end.value = customEnd.value
  } else {
    const days = Number(range.value)
    start.value = addDays(today.value, -(days - 1))
    end.value = today.value
  }
  void load()
}

async function load(): Promise<void> {
  await records.loadTrend({ kind: activeTab.value, rangeStart: start.value, rangeEnd: end.value })
}

function onTab(value: string): void {
  activeTab.value = value as TrendKind
  void load()
}

onMounted(async () => {
  await load()
})
</script>

<template>
  <div>
    <PageHeader title="趋势分析" subtitle="看见变化，也允许起伏" back>
      <template #actions>
        <Segmented v-model="range" :options="rangeOptions" aria-label="时间范围" @update:model-value="applyRange" />
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="trend-toolbar">
        <Segmented v-model="activeTab" :options="tabOptions" aria-label="趋势类型" @update:model-value="onTab" />
        <div v-if="range === 'custom'" class="trend-custom">
          <input v-model="customStart" type="date" aria-label="开始日期" />
          <span>至</span>
          <input v-model="customEnd" type="date" aria-label="结束日期" />
          <AppButton size="sm" variant="secondary" @click="applyRange">应用</AppButton>
        </div>
      </div>
      <p v-if="rangeError" class="trend-error" role="alert">{{ rangeError }}</p>

      <SectionCard :title="tabOptions.find((item) => item.value === activeTab)?.label ?? '趋势'" :subtitle="`${start} 至 ${end}`">
        <div v-if="!trend || trend.empty">
          <EmptyState title="这段时间还没有记录" description="把今天的一点点写下来，趋势会慢慢出现。" art="chart">
            <AppButton size="sm" @click="$router.push('/')">回到今日</AppButton>
          </EmptyState>
        </div>
        <div v-else class="trend-body">
          <template v-if="activeTab === 'focus' || activeTab === 'rest'">
            <BarChart :data="barData" :y-max="6" unit="小时" />
            <p class="trend-summary">
              合计 {{ trend.summary.total }} 小时 · 日均 {{ trend.summary.avg }} 分钟 · 最长 {{ trend.summary.max }} 小时
            </p>
          </template>

          <template v-else-if="activeTab === 'emotion'">
            <div class="emotion-grid">
              <DonutChart :slices="trend.emotionBreakdown.map((item) => ({ label: item.name, value: item.count, color: item.color }))" />
              <ul class="emotion-legend">
                <li v-for="item in trend.emotionBreakdown" :key="item.tagId">
                  <span class="emotion-dot" :style="{ background: item.color }" />
                  <span>{{ item.emoji }} {{ item.name }}</span>
                  <span class="emotion-count">{{ item.count }} 篇 · {{ Math.round(item.ratio * 100) }}%</span>
                </li>
              </ul>
            </div>
            <LineChart
              :series="[{ name: '强度', color: 'var(--gold)', points: trend.intensityPoints.map((item) => item.value) }]"
              :labels="emotionLabels"
              unit="级"
            />
            <p class="trend-summary">共 {{ trend.summary.total }} 篇手记 · 日均 {{ trend.summary.avg }} 篇</p>
          </template>

          <template v-else>
            <LineChart :series="valueSeries" :labels="lineLabels" unit="分" />
            <p class="trend-summary">正念 {{ trend.valueSeries?.mindfulness[trend.valueSeries.mindfulness.length - 1]?.value ?? 0 }} 分 · 逍遥 {{ trend.valueSeries?.freedom[trend.valueSeries.freedom.length - 1]?.value ?? 0 }} 分</p>
          </template>
        </div>
      </SectionCard>

      <YearHeatmap class="trend-heat" />
    </div>
  </div>
</template>

<style scoped>
.trend-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-bottom: var(--sp-3);
}

.trend-heat {
  margin-top: var(--sp-4);
}

.trend-custom {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.trend-custom input {
  height: 32px;
  padding: 0 8px;
  border-radius: var(--r-input);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: var(--fs-micro);
}

.trend-error {
  color: var(--danger);
  font-size: var(--fs-note);
  margin-bottom: var(--sp-2);
}

.trend-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.trend-summary {
  font-size: var(--fs-note);
  color: var(--muted);
  text-align: center;
}

.emotion-grid {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.emotion-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--fs-note);
  color: var(--text-2);
}

.emotion-legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.emotion-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.emotion-count {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--muted);
}
</style>