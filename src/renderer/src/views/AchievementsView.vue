<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Segmented from '@/components/common/Segmented.vue'
import Badge from '@/components/common/Badge.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useAchievementsStore } from '@/stores/achievements'
import { DEFAULT_RULES } from '@shared/defaultRules'
import type { AchievementDef } from '@shared/types/rules'
import type { AchievementStats, TitleLevelState } from '@shared/types/dto'

const router = useRouter()
const achievements = useAchievementsStore()
const line = ref('mindfulness')
const unlockedOnly = ref(false)

const board = computed(() => achievements.board)
const titles = computed(() => board.value?.titles ?? null)
const unlockedIds = computed(() => new Set(board.value?.unlocked.map((item) => item.achievementId) ?? []))
const stats = computed<AchievementStats | null>(() => board.value?.stats ?? null)

const lineOptions = [
  { value: 'mindfulness', label: '正念线' },
  { value: 'freedom', label: '逍遥线' },
  { value: 'all', label: '全部成就' }
]

const items = computed(() => {
  const all = board.value?.items ?? []
  return all
    .filter((item) => line.value === 'all' || item.line === line.value || item.line === 'both')
    .filter((item) => !unlockedOnly.value || unlockedIds.value.has(item.id))
    .sort((a, b) => a.sort - b.sort)
})

const currentTitles = computed<TitleLevelState[]>(() => {
  if (!titles.value) return []
  if (line.value === 'mindfulness') return [titles.value.mindfulness]
  if (line.value === 'freedom') return [titles.value.freedom]
  return [titles.value.mindfulness, titles.value.freedom]
})

const ladders = computed(() => {
  if (line.value === 'freedom') return [{ key: 'freedom', title: '逍遥线', defs: DEFAULT_RULES.titles.freedom, current: titles.value?.freedom.level ?? 0 }]
  if (line.value === 'all') {
    return [
      { key: 'mindfulness', title: '正念线', defs: DEFAULT_RULES.titles.mindfulness, current: titles.value?.mindfulness.level ?? 0 },
      { key: 'freedom', title: '逍遥线', defs: DEFAULT_RULES.titles.freedom, current: titles.value?.freedom.level ?? 0 }
    ]
  }
  return [{ key: 'mindfulness', title: '正念线', defs: DEFAULT_RULES.titles.mindfulness, current: titles.value?.mindfulness.level ?? 0 }]
})

function unlockedAt(id: string): string {
  const found = board.value?.unlocked.find((item) => item.achievementId === id)
  return found ? new Date(found.unlockedAt).toLocaleDateString('zh-CN') : ''
}

function progressOf(def: AchievementDef): { label: string; ratio: number } {
  const s = stats.value
  if (!s) return { label: '0 / 1', ratio: 0 }
  let current = 0
  if (def.conditionType === 'firstActivity') current = s.firstActivity ? 1 : 0
  else if (def.conditionType === 'focusSeconds') current = s.focusSeconds
  else if (def.conditionType === 'diaryDayStreak') current = s.diaryStreak
  else if (def.conditionType === 'diaryCount') current = s.diaryCount
  else if (def.conditionType === 'todoCompletedCount') current = s.todoCompletedCount
  else if (def.conditionType === 'habitDayStreak') current = s.habitStreak
  else if (def.conditionType === 'titleCount') current = s.titleCount
  else if (def.conditionType === 'freedomTotal') current = s.freedomTotal
  else if (def.conditionType === 'recordDayStreak') current = s.recordStreak
  else if (def.conditionType === 'exportCount') current = s.exportCount
  else if (def.conditionType === 'earlyLate') current = (s.earlyLate.early ? 1 : 0) + (s.earlyLate.late ? 1 : 0)
  const ratio = Math.min(1, current / Math.max(1, def.threshold))
  if (def.conditionType === 'focusSeconds') {
    return { label: `${Math.round((current / 3600) * 10) / 10} / ${Math.round(def.threshold / 3600)} 小时`, ratio }
  }
  if (def.conditionType === 'earlyLate') {
    return { label: `${s.earlyLate.early ? '已' : '未'}晨 · ${s.earlyLate.late ? '已' : '未'}夜`, ratio: (s.earlyLate.early ? 1 : 0) * 0.5 + (s.earlyLate.late ? 1 : 0) * 0.5 }
  }
  const unit =
    def.conditionType === 'diaryCount'
      ? '篇'
      : def.conditionType === 'todoCompletedCount' || def.conditionType === 'titleCount'
        ? '个'
        : def.conditionType === 'exportCount'
          ? '次'
          : def.conditionType === 'firstActivity'
            ? '笔'
            : '天'
  return { label: `${Math.min(current, def.threshold)} / ${def.threshold} ${unit}`, ratio }
}

onMounted(async () => {
  await achievements.load()
})
</script>

<template>
  <div>
    <PageHeader title="成就称号" subtitle="两条路，各有各的风景" back>
      <template #actions>
        <Segmented v-model="line" :options="lineOptions" aria-label="称号线路" />
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="ach-summary">
        <SectionCard v-for="title in currentTitles" :key="title.line" :title="title.line === 'mindfulness' ? '正念当前境界' : '逍遥当前境界'">
          <div class="ach-current">
            <span class="ach-current__name serif">{{ title.name }}</span>
            <span class="ach-current__score">{{ title.score }} 分</span>
          </div>
          <ProgressBar :value="title.progress" :color="title.line === 'mindfulness' ? 'green' : 'gold'" />
          <p class="ach-current__next">{{ title.maxed ? '已臻化境' : `距「${title.nextName}」还需 ${(title.nextThreshold ?? 0) - title.score} 分` }}</p>
        </SectionCard>
      </div>

      <SectionCard title="称号阶梯" subtitle="阈值固定，只增不减">
        <div v-for="ladder in ladders" :key="ladder.key" class="ladder">
          <h4 class="ladder__title">{{ ladder.title }}</h4>
          <ol class="timeline">
            <li
              v-for="(def, index) in ladder.defs"
              :key="def.name"
              class="timeline__item"
              :class="{
                'timeline__item--reached': index <= ladder.current,
                'timeline__item--current': index === ladder.current
              }"
            >
              <span class="timeline__dot" aria-hidden="true" />
              <div class="timeline__body">
                <span class="timeline__name">{{ def.name }}</span>
                <span class="timeline__threshold">{{ def.threshold }} 分</span>
                <span class="timeline__state">{{ index < ladder.current ? '已解锁' : index === ladder.current ? '当前' : '未解锁' }}</span>
              </div>
            </li>
          </ol>
        </div>
      </SectionCard>

      <SectionCard title="全部成就" :subtitle="`已解锁 ${board?.counts.unlocked ?? 0} / ${board?.counts.total ?? 12}`">
        <template #actions>
          <label class="ach-filter">
            <input v-model="unlockedOnly" type="checkbox" />
            <span>仅看已解锁</span>
          </label>
        </template>
        <div v-if="items.length === 0" class="ach-empty">还没有符合条件的成就。</div>
        <div v-else class="ach-grid">
          <article
            v-for="item in items"
            :key="item.id"
            class="ach-card"
            :class="{ 'ach-card--locked': !unlockedIds.has(item.id) }"
            :title="item.description"
          >
            <span class="ach-card__emoji">{{ unlockedIds.has(item.id) ? item.emoji : '🔒' }}</span>
            <div class="ach-card__body">
              <div class="ach-card__name">{{ item.name }}</div>
              <div class="ach-card__desc">{{ item.description }}</div>
              <ProgressBar :value="progressOf(item).ratio" :height="4" />
              <div class="ach-card__meta">
                <span>{{ progressOf(item).label }}</span>
                <Badge v-if="unlockedIds.has(item.id)" variant="gold">{{ unlockedAt(item.id) }}</Badge>
              </div>
            </div>
          </article>
        </div>
      </SectionCard>

      <div class="ach-footer">
        <AppButton variant="text" size="sm" @click="router.push('/self')">‹ 返回灵台</AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ach-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.ach-current {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--sp-2);
}

.ach-current__name {
  font-size: 22px;
  font-weight: 600;
  color: var(--green-deep);
}

.ach-current__score {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.ach-current__next {
  margin-top: 6px;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.ladder + .ladder {
  margin-top: var(--sp-4);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--line-soft);
}

.ladder__title {
  font-family: var(--font-serif);
  font-size: var(--fs-note);
  color: var(--muted);
  margin-bottom: var(--sp-2);
}

.timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 4px;
}

.timeline__item {
  position: relative;
  display: flex;
  gap: var(--sp-3);
  padding: 8px 0 8px 18px;
  color: var(--muted-2);
}

.timeline__item::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 18px;
  bottom: -8px;
  width: 1px;
  background: var(--line);
}

.timeline__item:last-child::before {
  display: none;
}

.timeline__dot {
  position: absolute;
  left: 0;
  top: 14px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid var(--line);
  background: var(--surface);
}

.timeline__item--reached .timeline__dot {
  border-color: var(--green);
  background: var(--green);
}

.timeline__item--current .timeline__dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 4px rgba(79, 122, 98, 0.16);
}

.timeline__item--reached {
  color: var(--text-2);
}

.timeline__item--current .timeline__name {
  color: var(--green-deep);
  font-weight: 600;
}

.timeline__body {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.timeline__name {
  font-family: var(--font-serif);
  font-size: var(--fs-body);
}

.timeline__threshold {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.timeline__state {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.ach-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.ach-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-2);
}

@media (min-width: 1000px) {
  .ach-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.ach-card {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--gold-soft);
  border: 1px solid var(--gold);
}

.ach-card--locked {
  background: var(--surface-2);
  border-color: var(--line-soft);
  filter: grayscale(0.6);
  opacity: 0.75;
}

.ach-card__emoji {
  font-size: 32px;
  line-height: 1.2;
}

.ach-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ach-card__name {
  font-size: var(--fs-body);
  font-weight: 500;
  color: var(--ink);
}

.ach-card__desc {
  font-size: var(--fs-micro);
  color: var(--muted);
  line-height: 1.5;
}

.ach-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-1);
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.ach-empty {
  padding: var(--sp-5);
  text-align: center;
  color: var(--muted);
  font-size: var(--fs-note);
}

.ach-footer {
  display: flex;
  justify-content: flex-start;
  margin-top: var(--sp-3);
}

@media (max-width: 640px) {
  .ach-summary {
    grid-template-columns: 1fr;
  }
}
</style>