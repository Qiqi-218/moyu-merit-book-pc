<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'
import AppButton from '@/components/common/AppButton.vue'
import Badge from '@/components/common/Badge.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import Modal from '@/components/common/Modal.vue'
import Field from '@/components/common/Field.vue'
import TextInput from '@/components/common/TextInput.vue'
import TextArea from '@/components/common/TextArea.vue'
import HeatGrid from '@/components/charts/HeatGrid.vue'
import { useAppStore } from '@/stores/app'
import { useAchievementsStore } from '@/stores/achievements'
import { useUiStore } from '@/stores/ui'
import { daysBetween } from '@shared/dateUtils'

const router = useRouter()
const app = useAppStore()
const achievements = useAchievementsStore()
const ui = useUiStore()

const editOpen = ref(false)
const saving = ref(false)
const heat = ref<Array<{ date: string; count: number }>>([])

const profile = computed(() => app.profile)
const nickname = computed(() => profile.value?.nickname ?? '修行者')
const bio = computed(() => profile.value?.bio ?? '还没有写下简介。')
const seed = computed(() => profile.value?.avatarSeed ?? 1)
const titles = computed(() => achievements.board?.titles ?? app.titles)
const unlockedIds = computed(() => new Set(achievements.board?.unlocked.map((item) => item.achievementId) ?? []))
const strip = computed(() => (achievements.board?.items ?? []).slice(0, 5))
const joinedDays = computed(() => {
  const created = profile.value?.createdAt
  if (!created) return 1
  return Math.max(1, daysBetween(created.slice(0, 10), new Date().toISOString().slice(0, 10)) + 1)
})

const form = reactive({ nickname: '', bio: '', avatarSeed: 1 as 1 | 2 | 3 })
const error = ref('')

const collections = computed(() => [
  { label: '静', unlocked: (titles.value?.mindfulness.level ?? 0) >= 1 },
  { label: '闲', unlocked: (titles.value?.freedom.level ?? 0) >= 1 },
  { label: '恒', unlocked: (achievements.board?.stats.habitStreak ?? 0) >= 3 },
  { label: '趣', unlocked: (achievements.board?.stats.diaryCount ?? 0) >= 5 }
])

function openEdit(): void {
  form.nickname = nickname.value
  form.bio = bio.value
  form.avatarSeed = seed.value
  error.value = ''
  editOpen.value = true
}

async function saveEdit(): Promise<void> {
  if (form.nickname.trim().length < 2) {
    error.value = '道号至少 2 个字'
    return
  }
  saving.value = true
  try {
    const success = await app.updateProfile({ nickname: form.nickname.trim(), bio: form.bio.trim(), avatarSeed: form.avatarSeed })
    if (!success) {
      error.value = '未能保存，请重试。'
      return
    }
    editOpen.value = false
    ui.pushToast('已保存', '', 'success')
  } finally {
    saving.value = false
  }
}

async function loadHeat(): Promise<void> {
  const result = await window.moyu.records.history({ sortBy: 'date', sortDir: 'desc', page: 1, pageSize: 14 })
  if (result.ok) {
    heat.value = result.data.rows
      .slice()
      .reverse()
      .map((row) => ({ date: row.date, count: row.records }))
  }
}

onMounted(async () => {
  await achievements.load()
  await loadHeat()
})
</script>

<template>
  <div>
    <PageHeader title="灵台" subtitle="个人道场，双轨修行">
      <template #actions>
        <AppButton variant="ghost" size="sm" @click="router.push('/self/achievements')">成就称号</AppButton>
        <AppButton size="sm" @click="router.push('/settings')">修行设置</AppButton>
      </template>
    </PageHeader>

    <div class="page-content">
      <div class="two-col spirit-grid">
        <div class="stack">
          <SectionCard>
            <div class="profile">
              <SealAvatar :name="nickname" :seed="seed" :size="96" />
              <div class="profile__info">
                <div class="profile__name-row">
                  <h2 class="page-title">{{ nickname }}</h2>
                  <Badge variant="green">入道 {{ joinedDays }} 天</Badge>
                </div>
                <p class="profile__bio">{{ bio }}</p>
                <AppButton variant="ghost" size="sm" @click="openEdit">编辑资料</AppButton>
              </div>
            </div>
          </SectionCard>

          <div class="title-cards">
            <SectionCard title="正念境界">
              <div class="title-card">
                <div class="title-card__top">
                  <span class="title-card__name serif">{{ titles?.mindfulness.name ?? '凡人' }}</span>
                  <span class="title-card__score">{{ titles?.mindfulness.score ?? 0 }} 分</span>
                </div>
                <ProgressBar :value="titles?.mindfulness.progress ?? 0" />
                <p class="title-card__next">
                  {{ titles?.mindfulness.maxed ? '已臻化境' : `下一阶：${titles?.mindfulness.nextName} · ${titles?.mindfulness.nextThreshold} 分` }}
                </p>
              </div>
            </SectionCard>
            <SectionCard title="逍遥境界">
              <div class="title-card">
                <div class="title-card__top">
                  <span class="title-card__name serif">{{ titles?.freedom.name ?? '凡人' }}</span>
                  <span class="title-card__score">{{ titles?.freedom.score ?? 0 }} 分</span>
                </div>
                <ProgressBar :value="titles?.freedom.progress ?? 0" color="gold" />
                <p class="title-card__next">
                  {{ titles?.freedom.maxed ? '已臻化境' : `下一阶：${titles?.freedom.nextName} · ${titles?.freedom.nextThreshold} 分` }}
                </p>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="我的成就" subtitle="解锁后不可撤销">
            <template #actions>
              <RouterLink to="/self/achievements" class="spirit__link">查看全部 ›</RouterLink>
            </template>
            <div class="badge-strip">
              <div v-for="item in strip" :key="item.id" class="mini-badge" :class="{ 'mini-badge--locked': !unlockedIds.has(item.id) }">
                <span class="mini-badge__emoji">{{ unlockedIds.has(item.id) ? item.emoji : '🔒' }}</span>
                <span class="mini-badge__name">{{ item.name }}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="修行收藏">
            <div class="collection">
              <div v-for="item in collections" :key="item.label" class="collection__seal" :class="{ 'collection__seal--locked': !item.unlocked }">
                <span>{{ item.label }}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <aside class="stack">
          <SectionCard title="本周概览" subtitle="颜色越深，记录越多">
            <HeatGrid :cells="heat" />
            <p class="spirit__heat-note">最近 14 天的记录热力格</p>
          </SectionCard>

          <SectionCard title="快捷设置">
            <div class="quick-settings">
              <button type="button" @click="router.push('/settings')">外观与字号</button>
              <button type="button" @click="router.push('/settings')">数据与备份</button>
              <button type="button" @click="router.push('/settings')">门禁与安全</button>
            </div>
          </SectionCard>

          <p class="spirit__footer">版本 {{ app.version?.appVersion ?? '1.0.0' }} · 数据仅存本机</p>
        </aside>
      </div>
    </div>

    <Modal v-if="editOpen" title="编辑资料" :width="480" @close="editOpen = false">
      <div class="stack">
        <Field label="道号" required :error="error">
          <TextInput v-model="form.nickname" :maxlength="64" :invalid="Boolean(error)" />
        </Field>
        <Field label="简介" hint="最多 200 字">
          <TextArea v-model="form.bio" :maxlength="200" :rows="3" />
        </Field>
        <Field label="印章样式">
          <div class="seed-row">
            <button
              v-for="value in ([1, 2, 3] as const)"
              :key="value"
              type="button"
              class="seed-btn"
              :class="{ 'seed-btn--active': form.avatarSeed === value }"
              @click="form.avatarSeed = value"
            >
              {{ form.nickname.slice(0, 1) || '德' }}
            </button>
          </div>
        </Field>
      </div>
      <template #footer>
        <AppButton variant="text" @click="editOpen = false">取消</AppButton>
        <AppButton :loading="saving" @click="saveEdit">保存</AppButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.spirit-grid {
  align-items: start;
}

.profile {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
}

.profile__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.profile__name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.profile__bio {
  font-size: var(--fs-note);
  color: var(--muted);
  line-height: 1.7;
}

.title-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.title-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.title-card__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

.title-card__name {
  font-size: 20px;
  color: var(--green-deep);
  font-weight: 600;
}

.title-card__score {
  font-size: var(--fs-micro);
  color: var(--muted);
}

.title-card__next {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.badge-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--sp-1);
}

.mini-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--sp-2) 4px;
  border-radius: var(--r-btn);
  background: var(--gold-soft);
  color: var(--gold-deep);
  font-size: var(--fs-micro);
  text-align: center;
}

.mini-badge--locked {
  background: var(--surface-2);
  color: var(--muted-2);
  filter: grayscale(1);
  opacity: 0.7;
}

.mini-badge__emoji {
  font-size: 20px;
}

.mini-badge__name {
  font-size: 10px;
}

.collection {
  display: flex;
  gap: var(--sp-2);
}

.collection__seal {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--green);
  border-radius: 3px;
  color: var(--green);
  font-family: var(--font-serif);
  font-size: 20px;
}

.collection__seal--locked {
  border-color: var(--line);
  color: var(--muted-2);
  opacity: 0.6;
  filter: grayscale(1);
}

.spirit__heat-note {
  margin-top: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.quick-settings {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-settings button {
  height: 36px;
  padding: 0 var(--sp-2);
  border-radius: var(--r-btn);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  color: var(--text-2);
  font-size: var(--fs-note);
  text-align: left;
}

.quick-settings button:hover {
  background: var(--green-soft);
  color: var(--green-deep);
}

.spirit__footer {
  text-align: center;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.spirit__link {
  font-size: var(--fs-note);
  color: var(--green-deep);
}

.seed-row {
  display: flex;
  gap: var(--sp-2);
}

.seed-btn {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--green-deep);
  font-family: var(--font-serif);
  font-size: 18px;
}

.seed-btn--active {
  border-color: var(--green);
  background: var(--green-soft);
}
</style>