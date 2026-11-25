<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Segmented from '@/components/common/Segmented.vue'
import AppButton from '@/components/common/AppButton.vue'
import Select from '@/components/common/Select.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { useTimerStore } from '@/stores/timer'
import { useTodayStore } from '@/stores/today'
import { useUiStore } from '@/stores/ui'
import type { RecordsOverview, TimerActiveState, TimerFinishResult } from '@shared/types/dto'
import type { TimerMode, TimerPurpose } from '@shared/types/models'
import { TARGET_UNIT_LABEL } from '@shared/constants'
import { formatDateCN } from '@shared/dateUtils'
import { displaySecondsOf } from '@shared/timerMath'
import { AMBIENT_KINDS, AMBIENT_LABELS, useAmbientSound } from '@/composables/useAmbientSound'

const route = useRoute()
const timer = useTimerStore()
const ambient = useAmbientSound()
const today = useTodayStore()
const ui = useUiStore()

const mode = ref<TimerMode>('countdown')
const purpose = ref<TimerPurpose>('focus')
const plannedMinutes = ref(25)
const customMinutes = ref(25)
const selectedInstanceId = ref(typeof route.query.instanceId === 'string' ? route.query.instanceId : '')
const displaySeconds = ref(25 * 60)
const overview = ref<RecordsOverview | null>(null)
const recent = ref<Array<{ id: string; title: string; minutes: number; purpose: string }>>([])
const recordOpen = ref(false)
const finishResult = ref<TimerFinishResult | null>(null)

let ticker: number | null = null

const modeOptions = [
  { value: 'countdown', label: '倒计时' },
  { value: 'countup', label: '正计时' }
]
const purposeOptions = [
  { value: 'focus', label: '专注' },
  { value: 'rest', label: '休息' }
]
const presets = [15, 25, 45, 60]

const instanceOptions = computed(() => [
  { value: '', label: '不绑定课业' },
  ...today.instances
    .filter((item) => item.eventKind !== 'principle')
    .map((item) => ({ value: item.id, label: item.eventTitle }))
])

const isActive = computed(() => timer.active !== null)
const isRunning = computed(() => timer.active?.status === 'running')

const activeMode = computed(() => timer.active?.mode ?? mode.value)
const activePurpose = computed(() => timer.active?.purpose ?? purpose.value)
const plannedSeconds = computed(() => timer.active?.plannedSeconds ?? plannedMinutes.value * 60)
const radius = 160
const circumference = 2 * Math.PI * radius
const progress = computed(() => {
  if (activeMode.value === 'countdown') {
    const total = Math.max(1, plannedSeconds.value)
    return Math.max(0, Math.min(1, displaySeconds.value / total))
  }
  return Math.min(1, displaySeconds.value / 3600)
})
const dashOffset = computed(() => circumference * (1 - progress.value))
const clock = computed(() => {
  const total = Math.max(0, displaySeconds.value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const ringColor = computed(() => (activePurpose.value === 'focus' ? 'var(--green)' : 'var(--gold)'))
const selectedTitle = computed(() => {
  const id = timer.active?.instanceId ?? selectedInstanceId.value
  if (!id) return '未绑定课业'
  return today.instances.find((item) => item.id === id)?.eventTitle ?? '已选课业'
})

function displayOf(active: TimerActiveState): number {
  return displaySecondsOf(active, Date.now())
}

function syncDisplay(): void {
  const active = timer.active
  if (!active) {
    displaySeconds.value = mode.value === 'countdown' ? plannedMinutes.value * 60 : 0
    return
  }
  displaySeconds.value = displayOf(active)
}

async function start(): Promise<void> {
  const payload: { mode: TimerMode; purpose: TimerPurpose; plannedMinutes?: number; instanceId?: string } = {
    mode: mode.value,
    purpose: purpose.value
  }
  if (mode.value === 'countdown') payload.plannedMinutes = plannedMinutes.value
  if (selectedInstanceId.value) payload.instanceId = selectedInstanceId.value
  const success = await timer.start(payload)
  if (success) syncDisplay()
}

function onAmbientVolume(event: Event): void {
  ambient.setVolume(Number((event.target as HTMLInputElement).value))
}

async function pause(): Promise<void> {
  const success = await timer.pause()
  if (success) syncDisplay()
}

async function resume(): Promise<void> {
  const success = await timer.resume()
  if (success) syncDisplay()
}

async function finish(): Promise<void> {
  const result = await timer.finish()
  if (!result) return
  finishResult.value = result

  if (result.session.purpose === 'focus' && result.canRecord) recordOpen.value = true
  syncDisplay()
}

async function record(): Promise<void> {
  const result = finishResult.value
  if (!result) return
  const instanceId = selectedInstanceId.value || result.defaultInstanceId || undefined
  const payload = instanceId ? { sessionId: result.session.id, instanceId } : { sessionId: result.session.id }
  const saved = await timer.record(payload.sessionId, payload.instanceId)
  if (saved) {
    ui.pushToast('已记入', '这次专注已写入课业与卷宗。', 'success')
    if (saved.instance) {
      today.applyResult({
        activity: saved.activity,
        ledger: saved.ledger,
        instance: saved.instance,
        dayTotals: saved.dayTotals
      })
    }
    recordOpen.value = false
    finishResult.value = null
    await loadOverview()
    await loadRecent()
  }
}

function onlySave(): void {
  recordOpen.value = false
  finishResult.value = null
  ui.pushToast('本次记录已保存', '未记入课业。')
  void loadRecent()
}

function setPreset(minutes: number): void {
  if (isActive.value) return
  plannedMinutes.value = minutes
  customMinutes.value = minutes
  displaySeconds.value = minutes * 60
}

function applyCustom(): void {
  const value = Math.max(1, Math.min(180, customMinutes.value))
  customMinutes.value = value
  plannedMinutes.value = value
  if (!isActive.value && mode.value === 'countdown') displaySeconds.value = value * 60
}

async function openMini(): Promise<void> {
  const opened = await timer.openMini()
  ui.pushToast(opened ? '迷你计时器已打开' : '迷你计时器已在桌面', '可在小窗中暂停或结束计时。')
}

async function loadOverview(): Promise<void> {
  const businessDate = today.businessDate || new Date().toISOString().slice(0, 10)
  const result = await window.moyu.records.overview({ businessDate })
  if (result.ok) overview.value = result.data
}

async function loadRecent(): Promise<void> {
  const businessDate = today.businessDate || new Date().toISOString().slice(0, 10)
  const result = await window.moyu.activities.list({ businessDate, page: 1, pageSize: 40 })
  if (!result.ok) return
  recent.value = result.data
    .filter((item) => item.kind === 'timer')
    .slice(0, 5)
    .map((item) => {
      const instance = item.instanceId ? today.instances.find((entry) => entry.id === item.instanceId) : null
      return {
        id: item.id,
        title: instance?.eventTitle ?? (item.purpose === 'rest' ? '休息' : '专注'),
        minutes: Math.round((item.durationSeconds / 60) * 10) / 10,
        purpose: item.purpose === 'rest' ? '休息' : '专注'
      }
    })
}

watch(
  () => timer.active,
  () => {
    syncDisplay()
  }
)

onMounted(async () => {
  if (!today.businessDate) await today.load()
  await timer.refresh()
  syncDisplay()
  await loadOverview()
  await loadRecent()
  ticker = window.setInterval(() => {
    const active = timer.active
    if (!active || active.status !== 'running') return
    displaySeconds.value = displayOf(active)
  }, 1000)
})

onUnmounted(() => {
  if (ticker !== null) window.clearInterval(ticker)
})
</script>

<template>
  <div>
    <PageHeader title="番茄钟" subtitle="把注意力放回一件事上">
      <template #actions>
        <span class="timer__date">{{ today.businessDate ? formatDateCN(today.businessDate) : '' }}</span>
        <AppButton variant="ghost" size="sm" @click="openMini">迷你计时器</AppButton>
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="timer-grid">
        <SectionCard title="选择课业" subtitle="可绑定一条分钟目标事项">
          <div class="stack">
            <Select v-model="selectedInstanceId" :options="instanceOptions" aria-label="选择绑定课业" :disabled="isActive" />
            <div class="picker-list">
              <button
                v-for="item in today.instances.filter((entry) => entry.eventKind !== 'principle').slice(0, 6)"
                :key="item.id"
                type="button"
                class="picker-item"
                :class="{ 'picker-item--active': selectedInstanceId === item.id }"
                :disabled="isActive"
                @click="selectedInstanceId = item.id"
              >
                <div class="picker-item__top">
                  <span>{{ item.eventTitle }}</span>
                  <span class="picker-item__value">{{ item.progressValue }} / {{ item.targetValue }} {{ TARGET_UNIT_LABEL[item.targetUnit] }}</span>
                </div>
                <ProgressBar :value="item.progressRatio" :height="4" />
              </button>
              <p v-if="today.instances.length === 0" class="muted">今日还没有课业，可先立一桩修行。</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="计时">
          <div class="timer-center">
            <div class="ring">
              <svg viewBox="0 0 360 360" class="ring__svg" aria-hidden="true">
                <circle cx="180" cy="180" :r="radius" fill="none" stroke="var(--line-soft)" stroke-width="10" />
                <circle
                  cx="180"
                  cy="180"
                  :r="radius"
                  fill="none"
                  :stroke="ringColor"
                  stroke-width="10"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="dashOffset"
                  transform="rotate(-90 180 180)"
                />
              </svg>
              <div class="ring__center">
                <span class="ring__time mono">{{ clock }}</span>
                <span class="ring__purpose">{{ activePurpose === 'focus' ? '专注' : '休息' }}</span>
              </div>
            </div>

            <p class="timer__instance">{{ selectedTitle }}</p>
            <p class="timer__status">
              {{ isActive ? (displaySeconds === 0 && activeMode === 'countdown' ? '倒计时已归零，可结束计时' : isRunning ? '计时进行中' : '已暂停') : displaySeconds === 0 && activeMode === 'countdown' ? '倒计时已归零，可结束计时' : '准备好后开始' }}
            </p>

            <div class="timer__segments">
              <Segmented v-model="mode" :options="modeOptions" aria-label="计时模式" :class="{ 'is-disabled': isActive }" />
              <Segmented v-model="purpose" :options="purposeOptions" aria-label="计时用途" :class="{ 'is-disabled': isActive }" />
            </div>

            <div v-if="!isActive && mode === 'countdown'" class="timer__presets">
              <button
                v-for="preset in presets"
                :key="preset"
                type="button"
                class="preset"
                :class="{ 'preset--active': plannedMinutes === preset }"
                @click="setPreset(preset)"
              >
                {{ preset }} 分钟
              </button>
              <div class="timer__custom">
                <input v-model.number="customMinutes" type="number" min="1" max="180" aria-label="自定义分钟数" @change="applyCustom" />
                <span>分钟</span>
              </div>
            </div>

            <div class="timer__controls">
              <AppButton v-if="!isActive" :loading="timer.loading" @click="start">开始</AppButton>
              <template v-else>
                <AppButton v-if="isRunning" variant="secondary" @click="pause">暂停</AppButton>
                <AppButton v-else variant="secondary" @click="resume">继续</AppButton>
                <AppButton variant="danger" :loading="timer.finishing" @click="finish">结束</AppButton>
              </template>
            </div>

            <p class="timer__note">退出本页不会丢失计时；结束计时不会自动完成事项。</p>

            <div class="timer__ambient">
              <div class="timer__ambient-head">
                <span class="timer__ambient-label">环境音</span>
                <span class="timer__ambient-hint">本地合成 · 无音频文件</span>
              </div>
              <div class="timer__ambient-body">
                <div class="timer__ambient-kinds">
                  <button
                    v-for="key in AMBIENT_KINDS"
                    :key="key"
                    type="button"
                    class="timer__ambient-btn"
                    :class="{ 'timer__ambient-btn--active': ambient.kind.value === key }"
                    :aria-pressed="ambient.kind.value === key"
                    @click="ambient.setKind(key)"
                  >
                    {{ AMBIENT_LABELS[key] }}
                  </button>
                </div>
                <input
                  class="timer__ambient-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="ambient.volume.value"
                  aria-label="环境音音量"
                  @input="onAmbientVolume"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="今日专注" subtitle="最近 5 次计时">
          <div class="stack">
            <div class="timer-stats">
              <div class="timer-stats__item"><strong>{{ overview?.todayStats.focusMinutes ?? 0 }}</strong><span>专注分钟</span></div>
              <div class="timer-stats__item"><strong>{{ overview?.todayStats.restMinutes ?? 0 }}</strong><span>休息分钟</span></div>
            </div>
            <ul class="recent-list">
              <li v-for="item in recent" :key="item.id" class="recent-item">
                <span class="recent-item__title">{{ item.title }}</span>
                <span class="recent-item__meta">{{ item.purpose }} · {{ item.minutes }} 分钟</span>
              </li>
              <li v-if="recent.length === 0" class="muted">还没有计时记录。</li>
            </ul>
          </div>
        </SectionCard>
      </div>
    </div>

    <Modal v-if="recordOpen && finishResult" title="记入课业" :width="460" @close="onlySave">
      <p class="record-text">
        记入《{{ selectedTitle }}》？<br />
        本次专注 {{ finishResult.focusMinutes }} 分钟。
      </p>
      <p class="record-note">记入后只会增加进度与功德，不会自动把事项标记为完成。</p>
      <template #footer>
        <AppButton variant="text" @click="onlySave">仅保存</AppButton>
        <AppButton @click="record">记入</AppButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.timer__date {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.timer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 1200px) {
  .timer-grid {
    grid-template-columns: 280px minmax(0, 1fr) 280px;
    align-items: start;
  }
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  max-height: 340px;
  overflow-y: auto;
}

.picker-item {
  text-align: left;
  padding: var(--sp-2);
  border-radius: var(--r-btn);
  border: 1px solid var(--line-soft);
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-2);
  font-size: var(--fs-note);
}

.picker-item--active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-deep);
}

.picker-item__top {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-1);
}

.picker-item__value {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.timer-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.ring {
  position: relative;
  width: 360px;
  height: 360px;
  max-width: 100%;
}

.ring__svg {
  width: 100%;
  height: 100%;
}

.ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ring__time {
  font-size: var(--fs-timer);
  line-height: 1;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.ring__purpose {
  font-size: var(--fs-note);
  color: var(--muted);
  letter-spacing: 0.16em;
}

.timer__instance {
  font-family: var(--font-serif);
  font-size: var(--fs-card);
  color: var(--ink);
}

.timer__status {
  font-size: var(--fs-note);
  color: var(--muted);
}

.timer__segments {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  justify-content: center;
}

.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.timer__presets {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-wrap: wrap;
  justify-content: center;
}

.preset {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: var(--fs-micro);
}

.preset--active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-deep);
}

.timer__custom {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.timer__custom input {
  width: 64px;
  height: 30px;
  border-radius: var(--r-input);
  border: 1px solid var(--line);
  background: var(--surface-2);
  padding: 0 8px;
  font-size: var(--fs-micro);
}

.timer__controls {
  display: flex;
  gap: var(--sp-2);
}

.timer__note {
  font-size: var(--fs-micro);
  color: var(--muted-2);
  text-align: center;
}

.timer__ambient {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.timer__ambient-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

.timer__ambient-label {
  font-size: var(--fs-note);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.06em;
}

.timer__ambient-hint {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.timer__ambient-body {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.timer__ambient-kinds {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--r-pill);
  background: var(--surface);
  border: 1px solid var(--line-soft);
}

.timer__ambient-btn {
  padding: 5px 11px;
  border-radius: var(--r-pill);
  font-size: var(--fs-note);
  color: var(--muted);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.timer__ambient-btn:hover {
  color: var(--green-deep);
}

.timer__ambient-btn--active {
  background: var(--green-soft);
  color: var(--green-deep);
}

.timer__ambient-volume {
  flex: 1;
  accent-color: var(--green);
}

.timer-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
}

.timer-stats__item {
  display: flex;
  flex-direction: column;
  padding: var(--sp-2);
  border-radius: var(--r-btn);
  background: var(--surface-2);
}

.timer-stats__item strong {
  font-family: var(--font-serif);
  font-size: 22px;
  color: var(--green-deep);
}

.timer-stats__item span {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: 8px 10px;
  border-radius: var(--r-btn);
  background: var(--surface-2);
  font-size: var(--fs-note);
}

.recent-item__title {
  color: var(--text-2);
}

.recent-item__meta {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.record-text {
  font-size: var(--fs-body);
  color: var(--ink);
  line-height: 1.8;
}

.record-note {
  margin-top: 6px;
  font-size: var(--fs-micro);
  color: var(--muted);
}
</style>