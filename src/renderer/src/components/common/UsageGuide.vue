<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SealLogo from '@/components/layout/SealLogo.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

interface GuideStep {
  key: string
  title: string
  subtitle: string
  points: string[]
}

const steps: GuideStep[] = [
  {
    key: 'home',
    title: '修身 · 今日',
    subtitle: '每天从这里开始',
    points: [
      '在「今日课业」里打卡，进度与功德即时更新',
      '分钟目标点「计时」可直接跳转番茄钟',
      '顶部双值卡分别是正念线与逍遥线，只增不减'
    ]
  },
  {
    key: 'events',
    title: '修行事项',
    subtitle: '待办、习惯与原则',
    points: [
      '待办与习惯会每周期生成课业，原则只作参照不计分',
      '习惯可选每日 / 每周 / 每月，目标可设为次数或分钟',
      '暂停、结束或删除都不会扣分，历史记录仍可追溯'
    ]
  },
  {
    key: 'timer',
    title: '番茄钟',
    subtitle: '把注意力放回一件事上',
    points: [
      '正计时 / 倒计时，专注 / 休息两种用途',
      '可开启置顶迷你计时器，切换页面不会中断计时',
      '结束计时不会自动完成事项，需要手动记入'
    ]
  },
  {
    key: 'mind',
    title: '修心 · 手记',
    subtitle: '记录情绪，也记录生活',
    points: [
      '写手记时选择 1–3 个情绪与强度',
      '月历用表情与色点标记每天的情绪',
      '离开页面前会自动保存草稿，下次继续写'
    ]
  },
  {
    key: 'records',
    title: '卷宗',
    subtitle: '回顾走过的路',
    points: [
      '查看双值、判词、趋势与日 / 周 / 月归档',
      '每日结算把当日行止定格为快照',
      '判词由本地规则生成，可切换润色版'
    ]
  },
  {
    key: 'self',
    title: '灵台 · 设置',
    subtitle: '个人道场与偏好',
    points: [
      '灵台查看称号、成就与收藏',
      '设置里可改主题、日界线、通知与口令',
      '支持备份、导入导出，示例数据也能一键清除'
    ]
  }
]

const ui = useUiStore()
const settingsStore = useSettingsStore()
const index = ref(0)

const current = computed<GuideStep>(() => steps[index.value] ?? steps[0] as GuideStep)
const isLast = computed(() => index.value === steps.length - 1)
const progressText = computed(() => `${String(index.value + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`)

function next(): void {
  if (isLast.value) {
    finish()
    return
  }
  index.value += 1
}

function prev(): void {
  if (index.value > 0) index.value -= 1
}

function finish(): void {
  ui.closeGuide()
  if (settingsStore.settings?.guidanceSeen !== true) {
    void settingsStore.patch({ guidanceSeen: true }, true)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    finish()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="guide-overlay">
    <div class="guide" role="dialog" aria-modal="true" aria-label="使用教学">
      <header class="guide__head">
        <div class="guide__brand">
          <SealLogo :size="34" />
          <div>
            <h2 class="guide__title serif">使用教学</h2>
            <p class="guide__subtitle">几步走完，便能自在修行</p>
          </div>
        </div>
        <span class="guide__progress mono">{{ progressText }}</span>
      </header>

      <div class="guide__body">
        <div class="guide__step">
          <span class="guide__index serif">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="guide__intro">
            <h3 class="guide__step-title serif">{{ current.title }}</h3>
            <p class="guide__step-sub">{{ current.subtitle }}</p>
          </div>
        </div>
        <ul class="guide__points">
          <li v-for="point in current.points" :key="point" class="guide__point">
            <span class="guide__dot" aria-hidden="true" />
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>

      <footer class="guide__foot">
        <div class="guide__dots" aria-hidden="true">
          <span
            v-for="(step, dotIndex) in steps"
            :key="step.key"
            class="guide__dot-mark"
            :class="{ 'guide__dot-mark--active': dotIndex === index, 'guide__dot-mark--done': dotIndex < index }"
          />
        </div>
        <div class="guide__actions">
          <AppButton v-if="index > 0" variant="text" size="sm" @click="prev">上一步</AppButton>
          <AppButton variant="ghost" size="sm" @click="finish">跳过</AppButton>
          <AppButton size="sm" @click="next">{{ isLast ? '开始修行' : '下一步' }}</AppButton>
        </div>
      </footer>
      <p class="guide__hint">← / → 切换，Esc 跳过 · 之后可在「修行设置」重新查看</p>
    </div>
  </div>
</template>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  background: var(--overlay);
  backdrop-filter: blur(3px);
}

.guide {
  width: 580px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border-radius: var(--r-card);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  animation: fade-in var(--t-base) var(--ease);
  overflow-y: auto;
}

.guide__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.guide__brand {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.guide__title {
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.guide__subtitle {
  margin-top: 4px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.guide__progress {
  font-size: var(--fs-micro);
  color: var(--green-deep);
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border: 1px solid var(--green-line);
  border-radius: var(--r-pill);
  background: var(--green-soft);
}

.guide__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-height: 196px;
}

.guide__step {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.guide__index {
  font-size: 40px;
  line-height: 1;
  color: var(--green);
  opacity: 0.55;
}

.guide__step-title {
  font-size: var(--fs-card);
  font-weight: 600;
  color: var(--ink);
}

.guide__step-sub {
  margin-top: 4px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.guide__points {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.guide__point {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  font-size: var(--fs-body);
  line-height: 1.7;
  color: var(--text-2);
}

.guide__dot {
  width: 6px;
  height: 6px;
  margin-top: 9px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--green);
}

.guide__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--line-soft);
}

.guide__dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.guide__dot-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
  transition: background var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
}

.guide__dot-mark--done {
  background: var(--green-line);
}

.guide__dot-mark--active {
  transform: scale(1.25);
  background: var(--green);
}

.guide__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.guide__hint {
  font-size: var(--fs-micro);
  color: var(--muted-2);
  text-align: center;
}
</style>