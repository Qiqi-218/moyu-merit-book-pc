<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Segmented from '@/components/common/Segmented.vue'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Badge from '@/components/common/Badge.vue'
import { useRecordsStore } from '@/stores/records'
import { useAppStore } from '@/stores/app'
import { useUiStore } from '@/stores/ui'
import type { DailyDetail, DailyArchiveCard, PeriodCard } from '@shared/types/dto'
import { formatShortCN, parseDateParts, weekdayShort } from '@shared/dateUtils'

const records = useRecordsStore()
const app = useAppStore()
const ui = useUiStore()

const tab = ref('daily')
const dailyPage = ref(1)
const periodPage = ref(1)
const expanded = ref<Set<string>>(new Set())
const details = ref<Record<string, DailyDetail>>({})
const historyQuery = reactive({ sortBy: 'date' as 'date' | 'mindfulness' | 'freedom' | 'focus' | 'records', sortDir: 'desc' as 'asc' | 'desc', page: 1, pageSize: 20 })

const tabOptions = [
  { value: 'daily', label: '日记' },
  { value: 'weekly', label: '周报' },
  { value: 'monthly', label: '月报' },
  { value: 'history', label: '历史' }
]

const dailyItems = computed(() => records.archiveDaily?.items ?? [])
const periodItems = computed(() => records.archivePeriod?.items ?? [])
const historyRows = computed(() => records.history?.rows ?? [])
const historyTotal = computed(() => records.history?.total ?? 0)
const historyPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyQuery.pageSize)))

function weekLabel(date: string): string {
  return weekdayShort(date)
}

async function load(): Promise<void> {
  if (tab.value === 'daily') await records.loadArchiveDaily(dailyPage.value, 20)
  else if (tab.value === 'weekly') await records.loadArchivePeriod('weekly', periodPage.value, 12)
  else if (tab.value === 'monthly') await records.loadArchivePeriod('monthly', periodPage.value, 12)
  else await records.loadHistory({ ...historyQuery })
}

function onTab(value: string): void {
  tab.value = value
  void load()
}

function onPeriodTab(value: string): void {
  tab.value = value
  void load()
}

async function toggleExpand(card: DailyArchiveCard): Promise<void> {
  const next = new Set(expanded.value)
  if (next.has(card.businessDate)) {
    next.delete(card.businessDate)
    expanded.value = next
    return
  }
  next.add(card.businessDate)
  expanded.value = next
  if (!details.value[card.businessDate]) {
    const result = await window.moyu.records.dailyDetail(card.businessDate)
    if (result.ok) details.value = { ...details.value, [card.businessDate]: result.data }
  }
}

function sortBy(column: 'date' | 'mindfulness' | 'freedom' | 'focus' | 'records'): void {
  if (historyQuery.sortBy === column) historyQuery.sortDir = historyQuery.sortDir === 'asc' ? 'desc' : 'asc'
  else {
    historyQuery.sortBy = column
    historyQuery.sortDir = 'desc'
  }
  historyQuery.page = 1
  void load()
}

function pageTo(page: number): void {
  historyQuery.page = Math.min(Math.max(1, page), historyPages.value)
  void load()
}

async function exportJson(): Promise<void> {
  const result = await window.moyu.backup.exportJson()
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  if (result.data.canceled) return
  ui.pushToast('已导出', result.data.path ?? '', 'success')
}

async function createBackup(): Promise<void> {
  const result = await window.moyu.backup.create()
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  if (result.data.canceled) return
  ui.pushToast('完整备份已保存', result.data.path, 'success')
}

async function restoreBackup(): Promise<void> {
  const result = await window.moyu.backup.restore()
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  if (result.data.canceled) return
  ui.pushToast('已从备份恢复', '数据已重新载入。', 'success')
  await app.refresh()
  await load()
}

function dateBlock(date: string): { day: string; month: string; week: string } {
  const parts = parseDateParts(date)
  return { day: String(parts.day).padStart(2, '0'), month: `${parts.month} 月`, week: weekLabel(date) }
}

function seriesMax(card: PeriodCard): number {
  return Math.max(1, ...card.series.flatMap((item) => [item.mindfulness, item.freedom]))
}

onMounted(async () => {
  await load()
})
</script>

<template>
  <div>
    <PageHeader title="修行归档" subtitle="日、周、月，都是走过的路" back>
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="exportJson">导出 JSON</AppButton>
        <AppButton variant="secondary" size="sm" @click="createBackup">完整备份</AppButton>
        <AppButton variant="ghost" size="sm" @click="restoreBackup">恢复备份</AppButton>
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="archive-tabs">
        <Segmented :model-value="tab" :options="tabOptions" aria-label="归档类型" @update:model-value="onTab" />
      </div>

      <template v-if="tab === 'daily'">
        <div v-if="dailyItems.length === 0">
          <SectionCard><EmptyState title="卷宗尚空，去记一笔吧" description="今天的行止会在结算后出现在这里。" art="scroll">
            <AppButton size="sm" @click="$router.push('/')">回到今日</AppButton>
          </EmptyState></SectionCard>
        </div>
        <div v-else class="stack">
          <SectionCard v-for="card in dailyItems" :key="card.businessDate" flush>
            <button type="button" class="daily-card" @click="toggleExpand(card)">
              <div class="daily-card__date">
                <strong>{{ dateBlock(card.businessDate).day }}</strong>
                <span>{{ dateBlock(card.businessDate).month }} · {{ dateBlock(card.businessDate).week }}</span>
              </div>
              <div class="daily-card__body">
                <div class="daily-card__meta">
                  <Badge variant="green">正念 +{{ card.mindfulnessDelta }}</Badge>
                  <Badge variant="gold">逍遥 +{{ card.freedomDelta }}</Badge>
                  <span class="daily-card__small">记录 {{ card.recordCount }} 笔 · 专注 {{ card.focusMinutes }} 分钟</span>
                </div>
                <p class="daily-card__verdict serif">{{ card.verdictText ?? '且记今日行止，静待判官落笔' }}</p>
                <div class="daily-card__emotions">
                  <span v-for="emotion in card.emotions" :key="emotion.tagId" class="daily-card__emotion">{{ emotion.emoji }} {{ emotion.name }}</span>
                </div>
              </div>
              <span class="daily-card__arrow" :class="{ 'daily-card__arrow--open': expanded.has(card.businessDate) }">›</span>
            </button>
            <div v-if="expanded.has(card.businessDate)" class="daily-detail">
              <div class="daily-detail__col">
                <h4>当日行止</h4>
                <ul>
                  <li v-for="activity in details[card.businessDate]?.activities ?? []" :key="activity.id">
                    <span>{{ activity.eventTitle ?? '计时' }}</span>
                    <span class="muted">{{ activity.durationSeconds ? `${Math.round(activity.durationSeconds / 60)} 分钟` : `数量 ${activity.quantity}` }}</span>
                  </li>
                  <li v-if="(details[card.businessDate]?.activities ?? []).length === 0" class="muted">没有行止记录。</li>
                </ul>
              </div>
              <div class="daily-detail__col">
                <h4>手记</h4>
                <ul>
                  <li v-for="item in details[card.businessDate]?.diaries ?? []" :key="item.id">
                    <span class="daily-detail__diary">{{ item.content.slice(0, 40) }}…</span>
                    <span class="muted">{{ item.emotions.map((emotion) => emotion.emoji).join(' ') }}</span>
                  </li>
                  <li v-if="(details[card.businessDate]?.diaries ?? []).length === 0" class="muted">这一天没有手记。</li>
                </ul>
              </div>
            </div>
          </SectionCard>
          <div class="pager">
            <AppButton variant="text" size="sm" :disabled="dailyPage <= 1" @click="dailyPage -= 1; load()">上一页</AppButton>
            <span class="muted">第 {{ dailyPage }} 页</span>
            <AppButton variant="text" size="sm" @click="dailyPage += 1; load()">下一页</AppButton>
          </div>
        </div>
      </template>

      <template v-else-if="tab === 'weekly' || tab === 'monthly'">
        <div class="archive-subtabs">
          <button type="button" :class="{ active: tab === 'weekly' }" @click="onPeriodTab('weekly')">周报</button>
          <button type="button" :class="{ active: tab === 'monthly' }" @click="onPeriodTab('monthly')">月报</button>
        </div>
        <div v-if="periodItems.length === 0">
          <SectionCard><EmptyState title="还没有周期小结" description="多记几天，周报与月报会自然出现。" art="scroll" /></SectionCard>
        </div>
        <div v-else class="stack">
          <SectionCard v-for="card in periodItems" :key="card.key" :title="card.label" :subtitle="`${card.start} 至 ${card.end}`">
            <div class="period-bars">
              <div v-for="item in card.series" :key="item.date" class="period-bar">
                <div class="period-bar__cols">
                  <span class="period-bar__col period-bar__col--m" :style="{ height: `${Math.max(4, (item.mindfulness / seriesMax(card)) * 60)}px` }" :title="`正念 ${item.mindfulness}`" />
                  <span class="period-bar__col period-bar__col--f" :style="{ height: `${Math.max(4, (item.freedom / seriesMax(card)) * 60)}px` }" :title="`逍遥 ${item.freedom}`" />
                </div>
                <span class="period-bar__label">{{ formatShortCN(item.date) }}</span>
              </div>
            </div>
            <div class="period-summary">
              <p v-for="(line, index) in card.summary" :key="index">{{ line }}</p>
            </div>
            <div class="period-meta">
              <span>最佳一天：{{ card.bestDay ? `${card.bestDay.date}（正念 ${card.bestDay.mindfulness} · 逍遥 ${card.bestDay.freedom}）` : '暂无' }}</span>
              <span>专注合计：{{ card.focusMinutes }} 分钟</span>
              <span>情绪 Top3：{{ card.topEmotions.length > 0 ? card.topEmotions.map((item) => `${item.emoji} ${item.name}`).join('、') : '暂无' }}</span>
            </div>
          </SectionCard>
        </div>
      </template>

      <template v-else>
        <SectionCard>
          <table class="history-table">
            <thead>
              <tr>
                <th><button type="button" @click="sortBy('date')">日期</button></th>
                <th><button type="button" @click="sortBy('mindfulness')">正念</button></th>
                <th><button type="button" @click="sortBy('freedom')">逍遥</button></th>
                <th><button type="button" @click="sortBy('focus')">专注</button></th>
                <th><button type="button" @click="sortBy('records')">记录</button></th>
                <th>判词</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in historyRows" :key="row.date">
                <td>{{ row.date }}</td>
                <td class="history-num">{{ row.mindfulness }}</td>
                <td class="history-num">{{ row.freedom }}</td>
                <td class="history-num">{{ row.focusMinutes }}</td>
                <td class="history-num">{{ row.records }}</td>
                <td class="history-verdict">{{ row.verdictText }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="historyRows.length === 0" class="muted history-empty">卷宗尚空，去记一笔吧</div>
          <div class="pager">
            <AppButton variant="text" size="sm" :disabled="historyQuery.page <= 1" @click="pageTo(historyQuery.page - 1)">上一页</AppButton>
            <span class="muted">第 {{ historyQuery.page }} / {{ historyPages }} 页</span>
            <AppButton variant="text" size="sm" :disabled="historyQuery.page >= historyPages" @click="pageTo(historyQuery.page + 1)">下一页</AppButton>
          </div>
        </SectionCard>
      </template>
    </div>
  </div>
</template>

<style scoped>
.archive-tabs,
.archive-subtabs {
  margin-bottom: var(--sp-3);
}

.archive-subtabs {
  display: flex;
  gap: var(--sp-1);
}

.archive-subtabs button {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: var(--fs-micro);
}

.archive-subtabs button.active {
  background: var(--green-soft);
  border-color: var(--green-line);
  color: var(--green-deep);
}

.daily-card {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  text-align: left;
}

.daily-card__date {
  flex: 0 0 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-2);
  border-radius: var(--r-btn);
  background: var(--surface-2);
}

.daily-card__date strong {
  font-family: var(--font-serif);
  font-size: 24px;
  color: var(--green-deep);
  line-height: 1.1;
}

.daily-card__date span {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.daily-card__body {
  flex: 1;
  min-width: 0;
}

.daily-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.daily-card__small {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.daily-card__verdict {
  margin-top: 6px;
  font-size: var(--fs-body);
  color: var(--ink);
  line-height: 1.7;
}

.daily-card__emotions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.daily-card__arrow {
  font-size: 22px;
  color: var(--muted-2);
  transform: rotate(90deg);
  transition: transform var(--t-fast) var(--ease);
}

.daily-card__arrow--open {
  transform: rotate(-90deg);
}

.daily-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border-top: 1px solid var(--line-soft);
  background: var(--surface-2);
}

.daily-detail__col h4 {
  font-family: var(--font-serif);
  font-size: var(--fs-note);
  color: var(--ink);
  margin-bottom: 6px;
}

.daily-detail__col li {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--text-2);
  padding: 4px 0;
}

.daily-detail__diary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period-bars {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: var(--sp-2);
  overflow-x: auto;
}

.period-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 24px;
}

.period-bar__cols {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 64px;
}

.period-bar__col {
  width: 6px;
  border-radius: 3px 3px 0 0;
}

.period-bar__col--m {
  background: var(--green);
}

.period-bar__col--f {
  background: var(--gold);
}

.period-bar__label {
  font-size: 9px;
  color: var(--muted-2);
  white-space: nowrap;
}

.period-summary {
  margin-top: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--fs-note);
  color: var(--text-2);
  line-height: 1.7;
}

.period-meta {
  margin-top: var(--sp-2);
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-note);
}

.history-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-weight: 400;
}

.history-table th button {
  color: inherit;
  font-size: inherit;
}

.history-table th button:hover {
  color: var(--green-deep);
}

.history-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line-soft);
  color: var(--text-2);
}

.history-num {
  font-family: var(--font-mono);
}

.history-verdict {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}

.history-empty {
  padding: var(--sp-5);
  text-align: center;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
</style>