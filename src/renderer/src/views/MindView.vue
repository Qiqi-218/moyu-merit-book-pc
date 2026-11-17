<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import AppButton from '@/components/common/AppButton.vue'
import EmotionChip from '@/components/common/EmotionChip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import StackedBar from '@/components/charts/StackedBar.vue'
import { useDiaryStore } from '@/stores/diary'
import { useAppStore } from '@/stores/app'
import { useUiStore } from '@/stores/ui'
import type { DiaryView } from '@shared/types/dto'
import { addDays, addMonths, daysInMonth, formatDateCN, monthLabel, monthStart, parseDateParts, weekdayCN, weekdayIndex } from '@shared/dateUtils'
import { INTENSITY_LABEL } from '@shared/constants'

const router = useRouter()
const diary = useDiaryStore()
const app = useAppStore()
const ui = useUiStore()
const deleteTarget = ref<DiaryView | null>(null)

const today = computed(() => app.today?.businessDate ?? new Date().toISOString().slice(0, 10))
const selected = computed(() => diary.selectedDate || today.value)
const selectedLabel = computed(() => (selected.value ? formatDateCN(selected.value) : ''))

const calendar = computed(() => {
  const first = monthStart(diary.year, diary.month)
  const offset = weekdayIndex(first)
  const start = addDays(first, -offset)
  const marks = new Map((diary.monthView?.days ?? []).map((item) => [item.businessDate, item]))
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    const parts = parseDateParts(date)
    const inMonth = parts.year === diary.year && parts.month === diary.month
    return { date, day: parts.day, inMonth, mark: marks.get(date) }
  })
})

const weekHeads = ['日', '一', '二', '三', '四', '五', '六']

const distributionSlices = computed(() =>
  (diary.monthView?.distribution ?? []).map((item) => ({
    label: item.name,
    value: item.count,
    ratio: item.ratio,
    color: item.color
  }))
)

async function changeMonth(delta: number): Promise<void> {
  const next = addMonths(monthStart(diary.year, diary.month), delta)
  const parts = parseDateParts(next)
  await diary.loadMonth(parts.year, parts.month)
  const first = monthStart(parts.year, parts.month)
  const total = daysInMonth(parts.year, parts.month)
  const target = selected.value >= first && selected.value < addDays(first, total) ? selected.value : first
  await diary.selectDate(target)
}

async function pick(date: string): Promise<void> {
  await diary.selectDate(date)
}

function isToday(date: string): boolean {
  return date === today.value
}

function intensityOf(value: number): string {
  return INTENSITY_LABEL[value] ?? ''
}

function edit(item: DiaryView): void {
  void router.push(`/mind/diary/${item.id}`)
}

function askDelete(item: DiaryView): void {
  deleteTarget.value = item
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value
  deleteTarget.value = null
  if (!target) return
  await diary.remove(target.id)
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void changeMonth(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    void changeMonth(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    void pick(addDays(selected.value, -1))
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    void pick(addDays(selected.value, 1))
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void router.push('/mind/diary/new')
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await diary.loadMonth()
  await diary.selectDate(today.value)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div>
    <PageHeader title="修心" subtitle="记录情绪，遇见更好的自己">
      <template #actions>
        <AppButton @click="router.push('/mind/diary/new')">写手记</AppButton>
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="two-col mind-grid">
        <SectionCard>
          <div class="month-nav">
            <button type="button" class="month-nav__btn" aria-label="上个月" @click="changeMonth(-1)">‹</button>
            <h2 class="card-title">{{ monthLabel(diary.year, diary.month) }}</h2>
            <button type="button" class="month-nav__btn" aria-label="下个月" @click="changeMonth(1)">›</button>
          </div>

          <div class="calendar-head">
            <span v-for="head in weekHeads" :key="head">{{ head }}</span>
          </div>

          <div class="calendar" role="grid" aria-label="情绪月历">
            <button
              v-for="cell in calendar"
              :key="cell.date"
              type="button"
              class="calendar__cell"
              :class="{
                'calendar__cell--muted': !cell.inMonth,
                'calendar__cell--today': isToday(cell.date),
                'calendar__cell--selected': selected === cell.date
              }"
              :aria-label="`${cell.date}${cell.mark ? `，${cell.mark.count} 篇手记` : ''}`"
              @click="pick(cell.date)"
            >
              <span class="calendar__day">{{ cell.day }}</span>
              <span class="calendar__emotions">
                <span v-for="emotion in cell.mark?.emotions ?? []" :key="emotion.tagId" class="calendar__emoji">{{ emotion.emoji }}</span>
              </span>
              <span v-if="cell.mark" class="calendar__dot" :style="{ opacity: 0.25 + cell.mark.maxIntensity * 0.15 }" />
            </button>
          </div>

          <div class="distribution">
            <h3 class="distribution__title">本月情绪分布</h3>
            <StackedBar :slices="distributionSlices" />
            <ul class="legend">
              <li v-for="item in diary.monthView?.distribution ?? []" :key="item.tagId" class="legend__item">
                <span class="legend__dot" :style="{ background: item.color }" />
                <span class="legend__emoji">{{ item.emoji }}</span>
                <span class="legend__name">{{ item.name }}</span>
                <span class="legend__count">{{ item.count }} 次</span>
                <span class="legend__ratio">{{ Math.round(item.ratio * 100) }}%</span>
              </li>
              <li v-if="(diary.monthView?.distribution ?? []).length === 0" class="muted">这个月还没有手记。</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard :title="selectedLabel" subtitle="当天的手记">
          <div v-if="diary.dayDiaries.length === 0">
            <EmptyState title="这一天还没有手记" description="有晴有雨，都是生活的一部分。" art="leaf">
              <AppButton size="sm" @click="router.push('/mind/diary/new')">写一篇</AppButton>
            </EmptyState>
          </div>
          <ul v-else class="diary-list">
            <li v-for="item in diary.dayDiaries" :key="item.id" class="diary-item">
              <div class="diary-item__head">
                <span class="diary-item__time mono">{{ new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
                <span class="diary-item__intensity">{{ intensityOf(item.intensity) }}</span>
              </div>
              <div class="diary-item__emotions">
                <EmotionChip
                  v-for="emotion in item.emotions"
                  :key="emotion.tagId"
                  :emoji="emotion.emoji"
                  :name="emotion.name"
                  :color="emotion.color"
                  :soft-color="emotion.softColor"
                  active
                />
              </div>
              <p class="diary-item__content">{{ item.content }}</p>
              <div class="diary-item__actions">
                <AppButton variant="text" size="sm" @click="edit(item)">编辑</AppButton>
                <AppButton variant="text" size="sm" @click="askDelete(item)">删除</AppButton>
              </div>
            </li>
          </ul>
          <p class="mind__tip">←/→ 切换月份，↑/↓ 切换日期</p>
        </SectionCard>
      </div>
    </div>

    <ConfirmDialog
      :visible="deleteTarget !== null"
      title="删除手记"
      message="删除这篇手记？相关的功德会按日重新计算，此操作不可撤销。"
      confirm-label="删除"
      danger
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.mind-grid {
  align-items: start;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}

.month-nav__btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--text-2);
  font-size: 18px;
}

.month-nav__btn:hover {
  background: var(--surface-2);
}

.calendar-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: var(--fs-micro);
  color: var(--muted-2);
  padding-bottom: 6px;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar__cell {
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  padding: 6px 2px;
  border-radius: 8px;
  border: 1px solid transparent;
  color: var(--text-2);
  font-size: var(--fs-note);
  transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}

.calendar__cell:hover {
  background: var(--surface-2);
}

.calendar__cell--muted {
  opacity: 0.35;
}

.calendar__cell--today {
  border-color: var(--green);
}

.calendar__cell--selected {
  background: var(--green-soft);
  color: var(--green-deep);
}

.calendar__day {
  font-size: var(--fs-note);
}

.calendar__emotions {
  display: flex;
  gap: 1px;
  font-size: 12px;
  line-height: 1;
}

.calendar__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
}

.distribution {
  margin-top: var(--sp-5);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--line-soft);
}

.distribution__title {
  font-family: var(--font-serif);
  font-size: var(--fs-card);
  font-weight: 600;
  margin-bottom: var(--sp-2);
}

.legend {
  margin-top: var(--sp-2);
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.legend__item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend__emoji {
  font-size: 12px;
}

.legend__count,
.legend__ratio {
  color: var(--muted-2);
}

.diary-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.diary-item {
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diary-item__head {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.diary-item__emotions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.diary-item__content {
  font-size: var(--fs-note);
  line-height: 1.7;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.diary-item__actions {
  display: flex;
  gap: var(--sp-1);
}

.mind__tip {
  margin-top: var(--sp-3);
  font-size: var(--fs-micro);
  color: var(--muted-2);
  text-align: center;
}
</style>