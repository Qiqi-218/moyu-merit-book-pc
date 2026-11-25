<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import DualValueCard from '@/components/common/DualValueCard.vue'
import AppButton from '@/components/common/AppButton.vue'
import Badge from '@/components/common/Badge.vue'
import Sparkline from '@/components/charts/Sparkline.vue'
import WeeklyReportCard from '@/components/records/WeeklyReportCard.vue'
import { useAppStore } from '@/stores/app'
import { useRecordsStore } from '@/stores/records'
import { useUiStore } from '@/stores/ui'
import { formatDateCN } from '@shared/dateUtils'

const router = useRouter()
const app = useAppStore()
const records = useRecordsStore()
const ui = useUiStore()
const polished = ref(false)

const businessDate = computed(() => app.today?.businessDate ?? new Date().toISOString().slice(0, 10))
const dateText = computed(() => formatDateCN(businessDate.value))

const verdict = computed(() => records.overview?.verdict ?? null)
const verdictText = computed(() => {
  if (!verdict.value) return '且记今日行止，静待判官落笔'
  return polished.value ? verdict.value.polishedText : verdict.value.text
})
const verdictStatus = computed(() => {
  if (!verdict.value) return '待结算'
  return verdict.value.status === 'empty' ? '今日无记录' : '本地判词'
})
const verdictFooter = computed(() => {
  const cn = dateText.value.replace(/ 周./, '')
  return `—— ${cn} · 今日修得${app.titles?.mindfulness.name ?? '凡人'}`
})

const sparkPoints = computed(() =>
  (records.overview?.sparkline14 ?? []).map((item) => ({ mindfulness: item.mindfulness, freedom: item.freedom }))
)

const stats = computed(() => records.overview?.todayStats ?? { records: 0, focusMinutes: 0, restMinutes: 0, emotionKinds: 0 })

async function settle(): Promise<void> {
  const result = await records.settle(businessDate.value)
  if (!result) return
  await app.refresh()
  await records.loadOverview(businessDate.value)
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

onMounted(async () => {
  if (!records.overview) await records.loadOverview(businessDate.value)
})
</script>

<template>
  <div>
    <PageHeader title="卷宗" subtitle="回顾走过的路，看见成长的自己">
      <template #actions>
        <AppButton variant="ghost" size="sm" :loading="records.settling" @click="settle">每日结算</AppButton>
        <AppButton variant="secondary" size="sm" @click="exportJson">导出</AppButton>
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="two-col records-grid">
        <div class="stack">
          <DualValueCard
            :mindfulness="records.overview?.totals.mindfulness ?? 0"
            :freedom="records.overview?.totals.freedom ?? 0"
            :delta-m="records.overview?.todayDelta.mindfulness ?? 0"
            :delta-f="records.overview?.todayDelta.freedom ?? 0"
            :sample="records.overview?.demoFlag ?? false"
            large
          />

          <WeeklyReportCard />

          <SectionCard title="近 14 天双值" subtitle="正念绿线 · 逍遥金线">
            <Sparkline :points="sparkPoints" />
            <div class="spark-legend">
              <span><i class="dot dot--green" />正念</span>
              <span><i class="dot dot--gold" />逍遥</span>
            </div>
          </SectionCard>

          <SectionCard title="今日行止">
            <div class="records-stats">
              <div class="records-stat"><strong>{{ stats.records }}</strong><span>记录笔数</span></div>
              <div class="records-stat"><strong>{{ stats.focusMinutes }}</strong><span>专注分钟</span></div>
              <div class="records-stat"><strong>{{ stats.restMinutes }}</strong><span>休息分钟</span></div>
              <div class="records-stat"><strong>{{ stats.emotionKinds }}</strong><span>情绪种数</span></div>
            </div>
          </SectionCard>

          <div class="entry-cards">
            <button type="button" class="entry-card" @click="router.push('/records/trends')">
              <div>
                <h3 class="card-title">趋势分析</h3>
                <p class="muted">专注、休息、情绪与双值的走势</p>
              </div>
              <span class="entry-card__arrow">›</span>
            </button>
            <button type="button" class="entry-card" @click="router.push('/records/archives')">
              <div>
                <h3 class="card-title">修行归档</h3>
                <p class="muted">日记、周报、月报与历史</p>
              </div>
              <span class="entry-card__arrow">›</span>
            </button>
          </div>
        </div>

        <aside class="stack">
          <SectionCard title="今日判词" subtitle="本地规则引擎生成">
            <template #actions>
              <Badge :variant="verdict?.status === 'empty' ? 'muted' : 'green'">{{ verdictStatus }}</Badge>
            </template>
            <div class="records-verdict">
              <span class="records-verdict__mark serif">“</span>
              <p class="records-verdict__text serif">{{ verdictText }}</p>
              <span class="records-verdict__mark records-verdict__mark--close serif">”</span>
              <p class="records-verdict__footer">{{ verdictFooter }}</p>
            </div>
            <div class="records-verdict__actions">
              <AppButton variant="text" size="sm" @click="polished = !polished">{{ polished ? '看简版' : '润色判词' }}</AppButton>
              <AppButton variant="ghost" size="sm" :loading="records.settling" @click="settle">每日结算</AppButton>
            </div>
            <p class="muted records-verdict__note">{{ dateText }}</p>
          </SectionCard>

          <p class="records__footer">双值由本地规则引擎结算 · 数据仅存于本机</p>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.records-grid {
  align-items: start;
}

.spark-legend {
  display: flex;
  gap: var(--sp-3);
  margin-top: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--muted);
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot--green {
  background: var(--green);
}

.dot--gold {
  background: var(--gold);
}

.records-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-2);
}

.records-stat {
  display: flex;
  flex-direction: column;
  padding: var(--sp-2);
  border-radius: var(--r-btn);
  background: var(--surface-2);
}

.records-stat strong {
  font-family: var(--font-serif);
  font-size: 22px;
  color: var(--green-deep);
}

.records-stat span {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.entry-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border-radius: var(--r-card);
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  text-align: left;
  transition: transform var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}

.entry-card:hover {
  transform: translateY(-1px);
  border-color: var(--green-line);
}

.entry-card__arrow {
  font-size: 24px;
  color: var(--green);
}

.records-verdict {
  position: relative;
  padding: var(--sp-2) 0 var(--sp-3);
}

.records-verdict__mark {
  font-size: 40px;
  color: var(--green-line);
  line-height: 1;
}

.records-verdict__mark--close {
  display: block;
  text-align: right;
}

.records-verdict__text {
  font-size: 22px;
  line-height: 1.85;
  color: var(--ink);
  letter-spacing: 0.04em;
}

.records-verdict__footer {
  margin-top: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--muted);
  text-align: right;
}

.records-verdict__actions {
  display: flex;
  gap: var(--sp-1);
}

.records-verdict__note {
  margin-top: var(--sp-2);
}

.records__footer {
  text-align: center;
  font-size: var(--fs-micro);
  color: var(--muted-2);
  letter-spacing: 0.06em;
}
</style>