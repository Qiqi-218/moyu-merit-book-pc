<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import FarMountainSvg from '@/components/layout/FarMountainSvg.vue'
import SealLogo from '@/components/layout/SealLogo.vue'
import DualValueCard from '@/components/common/DualValueCard.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import AppButton from '@/components/common/AppButton.vue'
import Badge from '@/components/common/Badge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Modal from '@/components/common/Modal.vue'
import { useAppStore } from '@/stores/app'
import { useTodayStore } from '@/stores/today'
import { useUiStore } from '@/stores/ui'
import type { InstanceView, RecordsOverview } from '@shared/types/dto'
import { GREETINGS, INSTANCE_STATUS_LABEL, TARGET_UNIT_LABEL } from '@shared/constants'
import { formatDateCN } from '@shared/dateUtils'

const router = useRouter()
const app = useAppStore()
const today = useTodayStore()
const ui = useUiStore()

const overview = ref<RecordsOverview | null>(null)
const detail = ref<InstanceView | null>(null)
const detailOpen = ref(false)

const businessDate = computed(() => today.businessDate || app.today?.businessDate || '')
const dateText = computed(() => (businessDate.value ? formatDateCN(businessDate.value) : ''))
const greeting = computed(() => {
  const hour = new Date().getHours()
  const found = GREETINGS.find((item) => (item.from <= item.to ? hour >= item.from && hour < item.to : hour >= item.from || hour < item.to))
  return found?.text ?? '今日亦可从容'
})
const completedCount = computed(() => today.completedCount)
const totalCount = computed(() => today.totalCount)
const listItems = computed(() => today.instances.slice(0, 4))
const sample = computed(() => app.demoFlag)
const verdictVersion = ref<'plain' | 'elegant'>('plain')
const verdictPlain = computed(() => overview.value?.verdict?.text ?? '且记今日行止，静待判官落笔')
const verdictElegant = computed(() => overview.value?.verdict?.polishedText || verdictPlain.value)
const verdictTextOf = computed(() => (verdictVersion.value === 'elegant' ? verdictElegant.value : verdictPlain.value))
const missing = computed(() => today.missing)
const stats = computed(() => overview.value?.todayStats ?? { records: 0, focusMinutes: 0, restMinutes: 0, emotionKinds: 0 })
const totals = computed(() => overview.value?.totals ?? { mindfulness: today.dayTotals?.mindfulnessTotal ?? 0, freedom: today.dayTotals?.freedomTotal ?? 0 })
const deltas = computed(() => ({
  m: overview.value?.todayDelta.mindfulness ?? today.dayTotals?.mindfulnessDelta ?? 0,
  f: overview.value?.todayDelta.freedom ?? today.dayTotals?.freedomDelta ?? 0
}))

async function loadOverview(): Promise<void> {
  if (!businessDate.value) return
  const result = await window.moyu.records.overview({ businessDate: businessDate.value })
  if (result.ok) overview.value = result.data
}

function sealOf(kind: string): string {
  if (kind === 'todo') return '待'
  if (kind === 'habit') return '习'
  return '则'
}

function statusOf(instance: InstanceView): string {
  return INSTANCE_STATUS_LABEL[instance.status] ?? instance.status
}

function unitOf(instance: InstanceView): string {
  return TARGET_UNIT_LABEL[instance.targetUnit] ?? ''
}

async function check(instance: InstanceView): Promise<void> {
  const success = await today.checkIn(instance.id)
  if (success) ui.pushToast('已记一笔', '进度与功德已更新。', 'success')
}

async function undo(instance: InstanceView): Promise<void> {
  const success = await today.revokeLast(instance.id)
  if (success) ui.pushToast('已撤销', '这笔功德已冲正。')
}

function goTimer(instance: InstanceView): void {
  void router.push({ path: '/timer', query: { instanceId: instance.id } })
}

function openDetail(instance: InstanceView): void {
  detail.value = instance
  detailOpen.value = true
}

async function generate(): Promise<void> {
  const success = await today.generate()
  if (success) {
    ui.pushToast('已生成今日课业', '缺的那几桩已经补齐。', 'success')
    await loadOverview()
  }
}

watch(
  () => today.dayTotals,
  () => {
    void loadOverview()
  }
)

onMounted(async () => {
  if (app.today && !today.businessDate) today.hydrate(app.today)
  await today.load(businessDate.value)
  await loadOverview()
})
</script>

<template>
  <div>
    <PageHeader title="摸鱼功德簿" subtitle="修身 · 今日修行，自在随心">
      <template #actions>
        <span class="home__date">{{ dateText }}</span>
        <AppButton variant="ghost" size="sm" @click="ui.openQuickNote()">速记</AppButton>
        <span class="home__shortcut">Ctrl+Shift+S 速记 · Ctrl+K 命令面板</span>
      </template>
    </PageHeader>

    <div class="page-content">
      <section class="hero">
        <div class="hero__art"><FarMountainSvg height="220px" /></div>
        <div class="hero__text">
          <p class="hero__greeting">{{ greeting }}</p>
          <h2 class="hero__quote serif">心随境转是凡夫，境随心转是圣贤</h2>
          <p class="hero__meta">今日课业 {{ completedCount }} / {{ totalCount }} 已了</p>
        </div>
        <div class="hero__seal"><SealLogo :size="56" /></div>
      </section>

      <div class="two-col home__grid">
        <div class="stack">
          <DualValueCard
            :mindfulness="totals.mindfulness"
            :freedom="totals.freedom"
            :delta-m="deltas.m"
            :delta-f="deltas.f"
            :sample="sample"
          />

          <SectionCard title="今日课业" subtitle="打卡即记，勿求圆满">
            <template #actions>
              <RouterLink to="/events" class="home__link">全部 ›</RouterLink>
            </template>

            <div v-if="listItems.length === 0">
              <EmptyState title="今日尚无课业" description="先立一桩修行，或为已有事项生成今日课业。">
                <AppButton @click="router.push('/events/new')">立一桩修行</AppButton>
                <AppButton variant="ghost" @click="generate">生成今日课业</AppButton>
              </EmptyState>
            </div>

            <ul v-else class="lesson-list">
              <li v-for="item in listItems" :key="item.id" class="lesson" @click="openDetail(item)">
                <span class="lesson__seal" :class="`lesson__seal--${item.eventKind}`">{{ sealOf(item.eventKind) }}</span>
                <div class="lesson__main">
                  <div class="lesson__top">
                    <span class="lesson__title">{{ item.eventTitle }}</span>
                    <span class="lesson__status">{{ statusOf(item) }}</span>
                  </div>
                  <ProgressBar :value="item.progressRatio" :height="5" />
                  <span class="lesson__progress">{{ item.progressValue }} / {{ item.targetValue }} {{ unitOf(item) }}</span>
                </div>
                <div class="lesson__action" @click.stop>
                  <AppButton
                    v-if="item.status === 'completed'"
                    variant="text"
                    size="sm"
                    @click="undo(item)"
                  >
                    已了 · 撤销
                  </AppButton>
                  <AppButton
                    v-else-if="item.targetUnit === 'minutes'"
                    variant="ghost"
                    size="sm"
                    @click="goTimer(item)"
                  >
                    计时
                  </AppButton>
                  <AppButton
                    v-else
                    size="sm"
                    :loading="today.pendingId === item.id"
                    @click="check(item)"
                  >
                    打卡
                  </AppButton>
                </div>
              </li>
            </ul>

            <div v-if="missing > 0" class="missing-notice">
              <span>还有 {{ missing }} 桩事项未生成今日课业</span>
              <button type="button" class="missing-notice__action" @click="generate">生成今日课业 →</button>
            </div>
          </SectionCard>
        </div>

        <aside class="stack">
          <SectionCard title="今日判词" subtitle="判官落笔">
            <template #actions>
              <div class="judge__versions" role="group" aria-label="判词版本">
                <button type="button" class="judge__version" :class="{ 'judge__version--active': verdictVersion === 'plain' }" @click="verdictVersion = 'plain'">简</button>
                <button type="button" class="judge__version" :class="{ 'judge__version--active': verdictVersion === 'elegant' }" @click="verdictVersion = 'elegant'">雅</button>
              </div>
              <Badge v-if="sample" variant="sample">示例</Badge>
            </template>
            <div class="judge">
              <div class="judge__seal" aria-hidden="true">
                <svg viewBox="0 0 64 64" class="judge__portrait" role="img" aria-label="判官">
                  <circle cx="32" cy="32" r="30" fill="var(--gold-soft)" stroke="var(--gold)" stroke-width="1.4" />
                  <path d="M18 23h28l-3-6H21z" fill="var(--gold-deep)" opacity="0.85" />
                  <rect x="14" y="23" width="36" height="4" rx="2" fill="var(--gold-deep)" />
                  <circle cx="32" cy="38" r="11.5" fill="var(--surface)" stroke="var(--gold-deep)" stroke-width="1.2" />
                  <circle cx="27.5" cy="36.5" r="1.5" fill="var(--ink)" />
                  <circle cx="36.5" cy="36.5" r="1.5" fill="var(--ink)" />
                  <path d="M26 43c1.8 2.6 3.8 3.8 6 3.8s4.2-1.2 6-3.8" fill="none" stroke="var(--gold-deep)" stroke-width="1.3" stroke-linecap="round" />
                  <path d="M32 28.5v3" stroke="var(--gold-deep)" stroke-width="1.2" stroke-linecap="round" />
                </svg>
              </div>
              <div class="judge__main">
                <div class="verdict">
                  <span class="verdict__mark serif">“</span>
                  <p class="verdict__text serif">{{ verdictTextOf }}</p>
                  <span class="verdict__mark verdict__mark--close serif">”</span>
                </div>
                <div class="judge__basis">
                  <span class="judge__basis-item">正念 <b>{{ deltas.m }}</b></span>
                  <span class="judge__basis-item">逍遥 <b>{{ deltas.f }}</b></span>
                  <span class="judge__basis-item">行止 <b>{{ stats.records }}</b> 笔</span>
                  <span class="judge__basis-item">专注 <b>{{ stats.focusMinutes }}</b> 分</span>
                  <span v-if="stats.emotionKinds > 0" class="judge__basis-item">情绪 <b>{{ stats.emotionKinds }}</b> 种</span>
                </div>
              </div>
            </div>
            <RouterLink to="/records/archives" class="home__link">往期判词 ›</RouterLink>
          </SectionCard>

          <SectionCard title="今日摘要">
            <div class="summary-grid">
              <div class="summary-item"><strong>{{ stats.records }}</strong><span>记录</span></div>
              <div class="summary-item"><strong>{{ stats.focusMinutes }}</strong><span>专注分钟</span></div>
              <div class="summary-item"><strong>{{ stats.restMinutes }}</strong><span>休息分钟</span></div>
              <div class="summary-item"><strong>{{ stats.emotionKinds }}</strong><span>情绪种数</span></div>
            </div>
          </SectionCard>

          <SectionCard title="快捷入口">
            <div class="quick-grid">
              <button type="button" class="quick" @click="router.push('/events')"><span aria-hidden="true">🗂</span>修行事项</button>
              <button type="button" class="quick" @click="router.push('/timer')"><span aria-hidden="true">⏳</span>番茄钟</button>
              <button type="button" class="quick" @click="router.push('/mind/diary/new')"><span aria-hidden="true">✍️</span>写手记</button>
              <button type="button" class="quick" @click="router.push('/records')"><span aria-hidden="true">📜</span>修行卷宗</button>
            </div>
          </SectionCard>

          <p class="home__footer">且记今日行止，静待判官落笔</p>
        </aside>
      </div>
    </div>

    <Modal v-if="detail && detailOpen" :title="detail.eventTitle" :width="480" @close="detailOpen = false">
      <div class="detail">
        <div class="detail__row"><span>类型</span><strong>{{ detail.eventKind === 'todo' ? '待办' : detail.eventKind === 'habit' ? '习惯' : '原则' }}</strong></div>
        <div class="detail__row"><span>状态</span><strong>{{ statusOf(detail) }}</strong></div>
        <div class="detail__row"><span>进度</span><strong>{{ detail.progressValue }} / {{ detail.targetValue }} {{ unitOf(detail) }}</strong></div>
        <div class="detail__row"><span>标签</span><strong>{{ detail.tagName ?? '未设标签' }}</strong></div>
      </div>
      <template #footer>
        <AppButton variant="text" @click="detailOpen = false">关闭</AppButton>
        <AppButton variant="secondary" @click="router.push(`/events/${detail.eventId}/edit`)">编辑事项</AppButton>
        <AppButton v-if="detail.targetUnit === 'minutes'" variant="ghost" @click="goTimer(detail)">去计时</AppButton>
        <AppButton v-else-if="detail.status !== 'completed'" @click="check(detail)">打卡</AppButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.home__date {
  font-size: var(--fs-note);
  color: var(--text-2);
}

.home__shortcut {
  font-size: var(--fs-micro);
  color: var(--muted-2);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 2px 10px;
}

.hero {
  position: relative;
  height: 220px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--green-soft);
  border: 1px solid var(--green-line);
  margin-bottom: var(--sp-5);
}

.hero__art {
  position: absolute;
  inset: 0;
  color: var(--green);
}

.hero__text {
  position: relative;
  z-index: 1;
  padding: var(--sp-5);
  max-width: 620px;
}

.hero__greeting {
  font-size: var(--fs-note);
  color: var(--green-deep);
  letter-spacing: 0.1em;
}

.hero__quote {
  margin-top: var(--sp-2);
  font-size: 30px;
  line-height: 1.5;
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.hero__meta {
  margin-top: var(--sp-2);
  font-size: var(--fs-note);
  color: var(--text-2);
}

.hero__seal {
  position: absolute;
  right: var(--sp-5);
  bottom: var(--sp-4);
}

.home__grid {
  align-items: start;
}

.home__link {
  font-size: var(--fs-note);
  color: var(--green-deep);
}

.lesson-list {
  display: flex;
  flex-direction: column;
}

.lesson {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-1);
  border-radius: var(--r-btn);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease);
}

.lesson:hover {
  background: rgba(79, 122, 98, 0.04);
}

.lesson__seal {
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

.lesson__seal--principle {
  background: var(--gold-soft);
  color: var(--gold-deep);
  border-color: var(--gold);
}

.lesson__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lesson__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.lesson__title {
  font-size: var(--fs-body);
  color: var(--ink);
}

.lesson__status {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.lesson__progress {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.lesson__action {
  flex: 0 0 auto;
}

.missing-notice {
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--line-soft);
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  font-size: var(--fs-note);
  color: var(--muted);
}

.missing-notice__action {
  color: var(--green-deep);
  font-size: var(--fs-note);
}

.verdict {
  position: relative;
  padding: var(--sp-2) var(--sp-1) var(--sp-4);
}

.verdict__mark {
  font-size: 34px;
  color: var(--green-line);
  line-height: 1;
}

.verdict__mark--close {
  display: block;
  text-align: right;
}

.verdict__text {
  font-size: 19px;
  line-height: 1.8;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.judge {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
}

.judge__seal {
  position: relative;
  flex: 0 0 64px;
  width: 64px;
  height: 64px;
}

.judge__portrait {
  width: 64px;
  height: 64px;
}

.judge__main {
  flex: 1;
  min-width: 0;
}

.judge__versions {
  display: inline-flex;
  padding: 2px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.judge__version {
  width: 26px;
  height: 22px;
  border-radius: var(--r-pill);
  font-size: var(--fs-micro);
  color: var(--muted);
  font-family: var(--font-serif);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.judge__version--active {
  background: var(--gold-soft);
  color: var(--gold-deep);
}

.judge__basis {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--sp-2);
}

.judge__basis-item {
  font-size: var(--fs-micro);
  color: var(--muted);
  padding: 3px 9px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
}

.judge__basis-item b {
  color: var(--green-deep);
  font-weight: 600;
  margin-left: 2px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
}

.summary-item {
  display: flex;
  flex-direction: column;
  padding: var(--sp-2);
  border-radius: var(--r-btn);
  background: var(--surface-2);
}

.summary-item strong {
  font-family: var(--font-serif);
  font-size: 22px;
  color: var(--green-deep);
}

.summary-item span {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
}

.quick {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  height: 44px;
  padding: 0 var(--sp-2);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  color: var(--text-2);
  font-size: var(--fs-note);
  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.quick:hover {
  background: var(--green-soft);
  color: var(--green-deep);
}

.home__footer {
  text-align: center;
  font-size: var(--fs-micro);
  color: var(--muted-2);
  letter-spacing: 0.08em;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.detail__row {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-body);
  color: var(--muted);
}

.detail__row strong {
  color: var(--ink);
  font-weight: 500;
}
</style>