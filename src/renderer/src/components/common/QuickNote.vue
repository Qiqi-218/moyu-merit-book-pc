<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SealLogo from '@/components/layout/SealLogo.vue'
import AppButton from '@/components/common/AppButton.vue'
import TextArea from '@/components/common/TextArea.vue'
import { useUiStore } from '@/stores/ui'
import { useTodayStore } from '@/stores/today'
import { useAppStore } from '@/stores/app'
import type { InstanceView } from '@shared/types/dto'

const router = useRouter()
const ui = useUiStore()
const today = useTodayStore()
const app = useAppStore()

const EMOTIONS = [
  { id: 'emotion-calm', emoji: '🍃', name: '平静' },
  { id: 'emotion-happy', emoji: '😊', name: '开心' },
  { id: 'emotion-tired', emoji: '😪', name: '疲惫' },
  { id: 'emotion-anxious', emoji: '😰', name: '焦虑' },
  { id: 'emotion-expect', emoji: '✨', name: '期待' },
  { id: 'emotion-warm', emoji: '🌤', name: '温暖' }
]

const tab = ref<'note' | 'check'>('note')
const content = ref('')
const emotion = ref('emotion-calm')
const saving = ref(false)

const todayId = computed(() => app.today?.businessDate ?? today.businessDate ?? '')
const pending = computed(() => today.instances.filter((item) => item.status === 'pending' || item.status === 'inProgress' || item.status === 'overdue'))

async function refreshDay(): Promise<void> {
  await app.refresh()
  if (app.today) today.hydrate(app.today)
}

async function saveNote(): Promise<void> {
  if (saving.value) return
  if (!content.value.trim()) {
    ui.pushToast('先写一句话，再记下')
    return
  }
  if (!todayId.value) {
    ui.pushToast('今日日期尚未就绪，请稍后再试')
    return
  }
  saving.value = true
  const result = await window.moyu.diary.create({
    businessDate: todayId.value,
    content: content.value.trim(),
    tagIds: [emotion.value],
    intensity: 3
  })
  saving.value = false
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  content.value = ''
  ui.closeQuickNote()
  ui.pushToast('已记下', '这条手记会进入今日的修心月历', 'success')
  await refreshDay()
}

async function doCheck(instance: InstanceView): Promise<void> {
  if (instance.targetUnit === 'minutes') {
    ui.closeQuickNote()
    void router.push('/timer')
    return
  }
  const success = await today.checkIn(instance)
  if (!success) return
  ui.pushToast('已打卡', instance.title, 'success')
  await refreshDay()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    ui.closeQuickNote()
    return
  }
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && tab.value === 'note') {
    event.preventDefault()
    void saveNote()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (today.instances.length === 0 && todayId.value) void today.load(todayId.value)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="quick-overlay" @click.self="ui.closeQuickNote()">
    <div class="quick" role="dialog" aria-modal="true" aria-label="速记">
      <header class="quick__head">
        <div class="quick__brand">
          <SealLogo :size="30" />
          <div>
            <h2 class="quick__title serif">速记</h2>
            <p class="quick__subtitle">随手一记，不打断当下</p>
          </div>
        </div>
        <div class="quick__tabs" role="tablist">
          <button type="button" class="quick__tab" :class="{ 'quick__tab--active': tab === 'note' }" role="tab" :aria-selected="tab === 'note'" @click="tab = 'note'">写手记</button>
          <button type="button" class="quick__tab" :class="{ 'quick__tab--active': tab === 'check' }" role="tab" :aria-selected="tab === 'check'" @click="tab = 'check'">打个卡</button>
        </div>
      </header>

      <div v-if="tab === 'note'" class="quick__body">
        <TextArea v-model="content" :maxlength="2000" :rows="5" placeholder="此刻在想什么？一句话也好…" />
        <div class="quick__emotions" role="group" aria-label="情绪">
          <button
            v-for="item in EMOTIONS"
            :key="item.id"
            type="button"
            class="quick__emotion"
            :class="{ 'quick__emotion--active': emotion === item.id }"
            :aria-pressed="emotion === item.id"
            @click="emotion = item.id"
          >
            <span class="quick__emoji" aria-hidden="true">{{ item.emoji }}</span>
            <span>{{ item.name }}</span>
          </button>
        </div>
        <div class="quick__foot">
          <span class="quick__hint">Ctrl + Enter 保存 · Esc 关闭</span>
          <AppButton size="sm" :disabled="saving" @click="saveNote">记下</AppButton>
        </div>
      </div>

      <div v-else class="quick__body">
        <p v-if="pending.length === 0" class="quick__empty">今日课业都处理好了，安心休息一会儿。</p>
        <ul v-else class="quick__list">
          <li v-for="item in pending" :key="item.id" class="quick__item">
            <div class="quick__item-main">
              <span class="quick__item-title">{{ item.title }}</span>
              <span class="quick__item-meta">{{ item.progressLabel }}</span>
            </div>
            <AppButton size="sm" variant="secondary" @click="doCheck(item)">{{ item.targetUnit === 'minutes' ? '去计时' : '打卡' }}</AppButton>
          </li>
        </ul>
        <div class="quick__foot">
          <span class="quick__hint">打卡即时生效 · Esc 关闭</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh var(--sp-4) var(--sp-4);
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

.quick {
  width: 520px;
  max-width: calc(100vw - 48px);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-card);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  animation: fade-in var(--t-base) var(--ease);
}

.quick__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.quick__brand {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.quick__title {
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
}

.quick__subtitle {
  margin-top: 2px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.quick__tabs {
  display: flex;
  padding: 3px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.quick__tab {
  padding: 5px 12px;
  border-radius: var(--r-pill);
  font-size: var(--fs-note);
  color: var(--muted);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.quick__tab--active {
  background: var(--green-soft);
  color: var(--green-deep);
}

.quick__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.quick__emotions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick__emotion {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: var(--fs-note);
  color: var(--text-2);
  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.quick__emotion:hover {
  border-color: var(--green-line);
}

.quick__emotion--active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-deep);
}

.quick__emoji {
  font-size: 14px;
}

.quick__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.quick__hint {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.quick__empty {
  padding: var(--sp-4);
  text-align: center;
  font-size: var(--fs-body);
  color: var(--muted);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px dashed var(--line);
}

.quick__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.quick__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: 8px 12px;
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.quick__item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.quick__item-title {
  font-size: var(--fs-body);
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick__item-meta {
  font-size: var(--fs-micro);
  color: var(--muted);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>