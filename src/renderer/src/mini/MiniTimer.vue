<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { TimerState } from '@shared/types/dto'
import { displaySecondsOf } from '@shared/timerMath'

const state = ref<TimerState>({ active: null, miniWindowOpen: true })
const seconds = ref(0)
let off: (() => void) | null = null
let ticker: number | null = null

const label = computed(() => {
  const active = state.value.active
  if (!active) return '暂无计时'
  return active.purpose === 'focus' ? '专注' : '休息'
})

const statusText = computed(() => {
  const active = state.value.active
  if (!active) return '从主窗或托盘开始'
  return active.status === 'running' ? '进行中' : '已暂停'
})

const display = computed(() => {
  const total = Math.max(0, seconds.value)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
})

function displayOf(active: TimerState['active']): number {
  if (!active) return 0
  return displaySecondsOf(active, Date.now())
}

function apply(next: TimerState): void {
  state.value = next
  seconds.value = displayOf(next.active)
}

async function refresh(): Promise<void> {
  const result = await window.moyu.timer.state()
  if (result.ok) apply(result.data)
}

async function toggle(): Promise<void> {
  const active = state.value.active
  if (!active) return
  const result = active.status === 'running' ? await window.moyu.timer.pause() : await window.moyu.timer.resume()
  if (result.ok) apply(result.data)
}

async function finish(): Promise<void> {
  const result = await window.moyu.timer.finish()
  if (result.ok) await refresh()
}

async function closeMini(): Promise<void> {
  await window.moyu.window.closeMini()
}

onMounted(() => {
  void refresh()
  off = window.moyu.on.timerState(apply)
  ticker = window.setInterval(() => {
    const active = state.value.active
    if (!active || active.status !== 'running') return
    seconds.value = displayOf(active)
  }, 1000)
})

onUnmounted(() => {
  off?.()
  if (ticker !== null) window.clearInterval(ticker)
})
</script>

<template>
  <div class="mini no-drag">
    <div class="mini__head drag-region">
      <span class="mini__label">{{ label }} · {{ statusText }}</span>
      <span class="mini__head-right">
        <span class="mini__seal">德</span>
        <button type="button" class="mini__close no-drag" aria-label="关闭迷你计时器" @click="closeMini">×</button>
      </span>
    </div>
    <div class="mini__time mono">{{ display }}</div>
    <div class="mini__actions">
      <button type="button" class="mini__btn" :disabled="!state.active" @click="toggle">
        {{ state.active?.status === 'running' ? '暂停' : '继续' }}
      </button>
      <button type="button" class="mini__btn mini__btn--danger" :disabled="!state.active" @click="finish">结束</button>
    </div>
  </div>
</template>

<style scoped>
.mini {
  height: 100vh;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
}

.mini__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mini__label {
  font-size: var(--fs-micro);
  color: var(--muted);
  letter-spacing: 0.04em;
}

.mini__seal {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--green);
  border-radius: 2px;
  color: var(--green);
  font-family: var(--font-serif);
  font-size: 10px;
}

.mini__head-right {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.mini__close {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--muted);
  font-size: 13px;
  line-height: 1;
  -webkit-app-region: no-drag;
}

.mini__close:hover {
  background: var(--danger);
  color: var(--surface);
}

.mini__time {
  font-size: 34px;
  line-height: 1.1;
  color: var(--green-deep);
  letter-spacing: 0.06em;
}

.mini__actions {
  display: flex;
  gap: 8px;
}

.mini__btn {
  flex: 1;
  height: 26px;
  border-radius: var(--r-btn);
  border: 1px solid var(--green-line);
  color: var(--green-deep);
  background: var(--surface-2);
  font-size: var(--fs-micro);
}

.mini__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini__btn--danger {
  border-color: var(--danger-line);
  color: var(--danger);
}
</style>