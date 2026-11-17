<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import Segmented from '@/components/common/Segmented.vue'
import AppButton from '@/components/common/AppButton.vue'
import Card from '@/components/common/Card.vue'
import Badge from '@/components/common/Badge.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import TagChip from '@/components/common/TagChip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Select from '@/components/common/Select.vue'
import { useEventsStore } from '@/stores/events'
import { useTodayStore } from '@/stores/today'
import { useUiStore } from '@/stores/ui'
import type { EventDetail, EventKind, EventSort } from '@shared/types/dto'
import type { EventStatus } from '@shared/types/models'
import { EVENT_KIND_LABEL, EVENT_STATUS_LABEL, TARGET_UNIT_LABEL } from '@shared/constants'

const router = useRouter()
const events = useEventsStore()
const today = useTodayStore()
const ui = useUiStore()

const searchRef = ref<HTMLInputElement | null>(null)
const keyword = ref(events.query.keyword)
const deleteTarget = ref<EventDetail | null>(null)
const busyId = ref('')

const kindOptions = computed(() => [
  { value: 'todo', label: EVENT_KIND_LABEL['todo'] ?? '待办', count: events.countsByKind.todo },
  { value: 'habit', label: EVENT_KIND_LABEL['habit'] ?? '习惯', count: events.countsByKind.habit },
  { value: 'principle', label: EVENT_KIND_LABEL['principle'] ?? '原则', count: events.countsByKind.principle }
])

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '修行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'ended', label: '已结束' }
]

const sortOptions = [
  { value: 'recent', label: '最近创建' },
  { value: 'completed', label: '最近完成' },
  { value: 'progress', label: '进度' }
]

const tagOptions = computed(() => [
  { value: 'all', label: '全部标签' },
  ...events.tags.filter((item) => item.kind === 'activity').map((item) => ({ value: item.id, label: item.name }))
])

const statusValue = computed(() => events.query.status ?? 'all')
const tagValue = computed(() => events.query.tagId ?? 'all')

const emptyText = computed(() => {
  if (events.query.kind === 'todo') return { title: '还没有待办', desc: '先立一桩今天想完成的小事。' }
  if (events.query.kind === 'habit') return { title: '还没有习惯', desc: '从一个轻一点的习惯开始，不必求满分。' }
  return { title: '还没有原则', desc: '写下一句想提醒自己的话，只作参照。' }
})

function onKind(value: string): void {
  void events.setKind(value as EventKind)
}

function onStatus(value: string): void {
  void events.setStatus(value === 'all' ? undefined : (value as EventStatus))
}

function onTag(value: string): void {
  void events.setTag(value === 'all' ? undefined : value)
}

function onSort(value: string): void {
  void events.setSort(value as EventSort)
}

function focusSearch(): void {
  searchRef.value?.focus()
}

function onSearchKey(event: KeyboardEvent): void {
  if (event.key === 'Enter') void events.setKeyword(keyword.value.trim())
}

function onGlobalKey(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    focusSearch()
  }
}

watch(keyword, (value) => {
  if (value.trim() === '') void events.setKeyword('')
})

async function checkIn(event: EventDetail): Promise<void> {
  const instance = event.todayInstance
  if (!instance) {
    ui.pushToast('今日课业尚未生成', '请回首页生成今日课业。')
    return
  }
  busyId.value = event.id
  const success = await today.checkIn(instance.id)
  busyId.value = ''
  if (success) {
    ui.pushToast('已记一笔', '进度与功德已更新。', 'success')
    await events.load()
  }
}

function goTimer(event: EventDetail): void {
  const query = event.todayInstance ? { instanceId: event.todayInstance.id } : undefined
  void router.push({ path: '/timer', query })
}

async function changeStatus(event: EventDetail, next: EventStatus): Promise<void> {
  busyId.value = event.id
  const result = await window.moyu.events.changeStatus(event.id, next)
  busyId.value = ''
  if (result.ok) {
    ui.pushToast('已更新状态', `现在为${EVENT_STATUS_LABEL[next] ?? next}`)
    await events.load()
  } else {
    ui.pushToast(result.error.message, result.error.hint)
  }
}

function askDelete(event: EventDetail): void {
  deleteTarget.value = event
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value
  deleteTarget.value = null
  if (!target) return
  const result = await window.moyu.events.remove(target.id, true)
  if (result.ok) {
    ui.pushToast('事项已删除', '历史记录仍可在卷宗中追溯。')
    await events.load()
  } else {
    ui.pushToast(result.error.message, result.error.hint)
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onGlobalKey)
  await events.loadTags()
  await events.load()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKey)
})
</script>

<template>
  <div>
    <PageHeader title="修行事项" subtitle="待办 · 习惯 · 原则">
      <template #actions>
        <input
          ref="searchRef"
          v-model="keyword"
          class="events__search"
          type="search"
          placeholder="搜索事项（Ctrl+F）"
          aria-label="搜索修行事项"
          @keydown="onSearchKey"
        />
        <AppButton @click="router.push('/events/new')">立一桩修行</AppButton>
      </template>
    </PageHeader>

    <div class="page-content page-content--narrow">
      <div class="events__toolbar">
        <Segmented :model-value="events.query.kind" :options="kindOptions" aria-label="事项类型" @update:model-value="onKind" />
        <div class="events__filters">
          <Select :model-value="statusValue" :options="statusOptions" aria-label="按状态筛选" @update:model-value="onStatus" />
          <Select :model-value="tagValue" :options="tagOptions" aria-label="按标签筛选" @update:model-value="onTag" />
          <Select :model-value="events.query.sort" :options="sortOptions" aria-label="排序方式" @update:model-value="onSort" />
        </div>
      </div>

      <div v-if="events.items.length === 0" class="events__empty">
        <EmptyState :title="emptyText.title" :description="emptyText.desc" art="leaf">
          <AppButton @click="router.push('/events/new')">立一桩修行</AppButton>
        </EmptyState>
      </div>

      <div v-else class="events__grid">
        <Card v-for="event in events.items" :key="event.id" class="event-card">
          <div class="event-card__head">
            <span class="event-card__seal" :class="`event-card__seal--${event.kind}`">{{ event.kind === 'todo' ? '待' : event.kind === 'habit' ? '习' : '则' }}</span>
            <div class="event-card__title-wrap">
              <h3 class="event-card__title">{{ event.title }}</h3>
              <div class="event-card__meta">
                <TagChip v-if="event.tagName" :label="event.tagName" />
                <Badge :variant="event.status === 'active' ? 'green' : event.status === 'paused' ? 'muted' : 'muted'">
                  {{ EVENT_STATUS_LABEL[event.status] ?? event.status }}
                </Badge>
                <Badge v-if="event.kind === 'principle'" variant="gold">参照</Badge>
              </div>
            </div>
            <details v-if="event.kind !== 'principle'" class="more">
              <summary aria-label="更多操作">⋯</summary>
              <div class="more__panel">
                <button v-if="event.status !== 'active'" type="button" @click="changeStatus(event, 'active')">恢复修行</button>
                <button v-if="event.status === 'active'" type="button" @click="changeStatus(event, 'paused')">暂停</button>
                <button type="button" @click="changeStatus(event, 'ended')">结束</button>
                <button type="button" class="more__danger" @click="askDelete(event)">删除</button>
              </div>
            </details>
          </div>

          <div v-if="event.kind !== 'principle'" class="event-card__progress">
            <ProgressBar :value="event.todayInstance?.progressRatio ?? 0" :height="6" />
            <span class="event-card__progress-text">
              今日 {{ event.todayInstance?.progressValue ?? 0 }} / {{ event.todayInstance?.targetValue ?? event.targetValue }}
              {{ TARGET_UNIT_LABEL[event.targetUnit] }}
            </span>
          </div>
          <p v-else class="event-card__principle">只作参照，不打卡、不计分。</p>

          <div class="event-card__actions">
            <template v-if="event.kind !== 'principle'">
              <AppButton
                v-if="event.targetUnit === 'minutes'"
                variant="ghost"
                size="sm"
                @click="goTimer(event)"
              >
                计时
              </AppButton>
              <AppButton
                v-else
                size="sm"
                :loading="busyId === event.id"
                :disabled="event.todayInstance?.status === 'completed'"
                @click="checkIn(event)"
              >
                {{ event.todayInstance?.status === 'completed' ? '已了' : '打卡' }}
              </AppButton>
            </template>
            <AppButton variant="text" size="sm" @click="router.push(`/events/${event.id}/edit`)">编辑</AppButton>
            <span v-if="event.completionRate14 > 0" class="event-card__rate">近 14 天完成 {{ Math.round(event.completionRate14 * 100) }}%</span>
          </div>
        </Card>
      </div>
    </div>

    <ConfirmDialog
      :visible="deleteTarget !== null"
      title="删除事项"
      :message="`确认删除「${deleteTarget?.title ?? ''}」？\n事项将被软删除，历史记录仍会保留在卷宗中。`"
      confirm-label="删除"
      danger
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.events__search {
  width: 220px;
  height: 36px;
  padding: 0 var(--sp-3);
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: var(--fs-note);
}

.events__search:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(79, 122, 98, 0.15);
}

.events__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-bottom: var(--sp-4);
}

.events__filters {
  display: flex;
  gap: var(--sp-2);
  min-width: 0;
}

.events__filters :deep(.select-wrap) {
  width: 132px;
}

.events__empty {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
}

.events__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
}

@media (min-width: 1200px) {
  .events__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.event-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  transition: transform var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease);
}

.event-card:hover {
  transform: translateY(-1px);
}

.event-card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
}

.event-card__seal {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-family: var(--font-serif);
  font-size: 12px;
  background: var(--green-soft);
  color: var(--green-deep);
  border: 1px solid var(--green-line);
}

.event-card__seal--principle {
  background: var(--gold-soft);
  color: var(--gold-deep);
  border-color: var(--gold);
}

.event-card__title-wrap {
  flex: 1;
  min-width: 0;
}

.event-card__title {
  font-family: var(--font-serif);
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
}

.event-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.event-card__progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-card__progress-text {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.event-card__principle {
  font-size: var(--fs-note);
  color: var(--muted);
}

.event-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-wrap: wrap;
}

.event-card__rate {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.more {
  position: relative;
}

.more summary {
  list-style: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--muted);
  cursor: pointer;
}

.more summary::-webkit-details-marker {
  display: none;
}

.more summary:hover {
  background: var(--surface-2);
}

.more__panel {
  position: absolute;
  right: 0;
  top: 32px;
  z-index: var(--z-overlay);
  width: 132px;
  padding: 4px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-btn);
  box-shadow: var(--shadow-pop);
  display: flex;
  flex-direction: column;
}

.more__panel button {
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  text-align: left;
  font-size: var(--fs-note);
  color: var(--text-2);
}

.more__panel button:hover {
  background: var(--surface-2);
}

.more__danger {
  color: var(--danger);
}
</style>