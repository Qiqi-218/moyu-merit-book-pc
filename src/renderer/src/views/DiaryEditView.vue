<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Field from '@/components/common/Field.vue'
import TextArea from '@/components/common/TextArea.vue'
import AppButton from '@/components/common/AppButton.vue'
import EmotionChip from '@/components/common/EmotionChip.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAppStore } from '@/stores/app'
import { useDiaryStore } from '@/stores/diary'
import { useUiStore } from '@/stores/ui'
import type { Tag } from '@shared/types/models'
import { INTENSITY_LABEL } from '@shared/constants'
import { validateDiaryContent, validateEmotionTagIds } from '@shared/validators'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const diaryStore = useDiaryStore()
const ui = useUiStore()

const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const editing = computed(() => Boolean(id.value))
const scope = computed(() => (editing.value ? `diary:${id.value}` : 'diary:new'))
const today = computed(() => app.today?.businessDate ?? new Date().toISOString().slice(0, 10))

const businessDate = ref(today.value)
const content = ref('')
const tagIds = ref<string[]>([])
const intensity = ref<1 | 2 | 3 | 4 | 5>(3)
const emotions = ref<Tag[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const deleteOpen = ref(false)
const draftSavedAt = ref('')
let draftTimer: number | null = null
let hydrated = false

const intensityOptions = [1, 2, 3, 4, 5] as const

function toggleEmotion(tagId: string): void {
  const index = tagIds.value.indexOf(tagId)
  if (index >= 0) {
    tagIds.value.splice(index, 1)
    return
  }
  if (tagIds.value.length >= 3) {
    ui.pushToast('最多选择 3 个情绪')
    return
  }
  tagIds.value.push(tagId)
}

function validate(): boolean {
  error.value = ''
  const contentCheck = validateDiaryContent(content.value)
  if (!contentCheck.valid) {
    error.value = contentCheck.message ?? '请写下手记内容'
    return false
  }
  const tagCheck = validateEmotionTagIds(tagIds.value)
  if (!tagCheck.valid) {
    error.value = tagCheck.message ?? '请选择情绪'
    return false
  }
  if (businessDate.value > today.value) {
    error.value = '日期不得晚于今天'
    return false
  }
  return true
}

async function saveDraft(): Promise<void> {
  if (!hydrated) return
  const payload = {
    content: content.value,
    tagIds: tagIds.value,
    intensity: intensity.value,
    businessDate: businessDate.value,
    savedAt: new Date().toISOString()
  }
  const result = await window.moyu.diary.saveDraft(scope.value, payload)
  if (result.ok) draftSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function scheduleDraft(): void {
  if (!hydrated) return
  if (draftTimer !== null) window.clearTimeout(draftTimer)
  draftTimer = window.setTimeout(() => {
    void saveDraft()
  }, 800)
}

async function save(): Promise<void> {
  if (!validate()) return
  saving.value = true
  try {
    const input = {
      businessDate: businessDate.value,
      content: content.value.trim(),
      tagIds: tagIds.value,
      intensity: intensity.value
    }
    const result = editing.value ? await window.moyu.diary.update(id.value, input) : await window.moyu.diary.create(input)
    if (!result.ok) {
      ui.pushToast(result.error.message, result.error.hint)
      return
    }
    await window.moyu.diary.clearDraft({ scope: scope.value })
    ui.pushToast(editing.value ? '手记已更新' : '手记已存', '写下来的情绪，会变得不再沉重。', 'success')
    await diaryStore.loadMonth()
    await diaryStore.selectDate(businessDate.value)
    await router.push('/mind')
  } finally {
    saving.value = false
  }
}

async function removeDiary(): Promise<void> {
  deleteOpen.value = false
  const success = await diaryStore.remove(id.value)
  if (success) await router.push('/mind')
}

watch([content, tagIds, intensity, businessDate], scheduleDraft, { deep: true })

onMounted(async () => {
  const tagResult = await window.moyu.tags.list()
  if (tagResult.ok) emotions.value = tagResult.data.filter((item) => item.kind === 'emotion')
  if (editing.value) {
    loading.value = true
    const result = await window.moyu.diary.get(id.value)
    loading.value = false
    if (!result.ok) {
      ui.pushToast(result.error.message, result.error.hint)
      await router.push('/mind')
      return
    }
    businessDate.value = result.data.businessDate
    content.value = result.data.content
    tagIds.value = [...result.data.tagIds]
    intensity.value = result.data.intensity
    const draft = await window.moyu.diary.getDraft({ scope: scope.value })
    if (draft.ok && draft.data) {
      businessDate.value = draft.data.businessDate || businessDate.value
      content.value = draft.data.content
      tagIds.value = [...draft.data.tagIds]
      const value = Math.max(1, Math.min(5, draft.data.intensity))
      intensity.value = value as 1 | 2 | 3 | 4 | 5
      draftSavedAt.value = '已恢复上次草稿'
    }
  } else {
    const draft = await window.moyu.diary.getDraft({ scope: 'diary:new' })
    if (draft.ok && draft.data) {
      businessDate.value = draft.data.businessDate || today.value
      content.value = draft.data.content
      tagIds.value = [...draft.data.tagIds]
      const value = Math.max(1, Math.min(5, draft.data.intensity))
      intensity.value = value as 1 | 2 | 3 | 4 | 5
      draftSavedAt.value = '已恢复上次草稿'
    }
  }
  hydrated = true
})

onUnmounted(() => {
  if (draftTimer !== null) window.clearTimeout(draftTimer)
})
</script>

<template>
  <div>
    <PageHeader :title="editing ? '编辑手记' : '写手记'" subtitle="记录情绪，遇见更好的自己" back>
      <template #actions>
        <span v-if="draftSavedAt" class="diary__draft">草稿 {{ draftSavedAt }}</span>
      </template>
    </PageHeader>

    <div class="page-content page-content--diary">
      <div class="diary-grid">
        <SectionCard>
          <div v-if="loading" class="muted">正在读取…</div>
          <div v-else class="stack">
            <Field label="日期" hint="不得晚于今天">
              <input v-model="businessDate" type="date" class="diary__date" :max="today" aria-label="手记日期" />
            </Field>

            <Field label="正文" required :error="error" for-id="diary-content">
              <TextArea
                id="diary-content"
                v-model="content"
                :maxlength="1000"
                :rows="10"
                placeholder="今天发生了什么？此刻的心情是什么？"
                :invalid="Boolean(error)"
              />
            </Field>
            <div class="diary__counter">{{ content.length }} / 1000</div>

            <Field label="情绪" hint="选择 1–3 个">
              <div class="diary__emotions">
                <EmotionChip
                  v-for="emotion in emotions"
                  :key="emotion.id"
                  :emoji="emotion.emoji ?? '🍃'"
                  :name="emotion.name"
                  :color="emotion.color ?? '#4F7A62'"
                  :soft-color="emotion.softColor ?? '#E8F0E8'"
                  :active="tagIds.includes(emotion.id)"
                  :disabled="!tagIds.includes(emotion.id) && tagIds.length >= 3"
                  @select="toggleEmotion(emotion.id)"
                />
              </div>
            </Field>

            <Field label="强度" :hint="INTENSITY_LABEL[intensity]">
              <div class="diary__intensity">
                <button
                  v-for="value in intensityOptions"
                  :key="value"
                  type="button"
                  class="intensity-dot"
                  :class="{ 'intensity-dot--active': intensity === value }"
                  :style="{ opacity: 0.25 + value * 0.14 }"
                  :aria-label="`强度 ${value} ${INTENSITY_LABEL[value]}`"
                  :aria-pressed="intensity === value"
                  @click="intensity = value"
                />
                <span class="diary__intensity-label">{{ INTENSITY_LABEL[intensity] }}</span>
              </div>
            </Field>
          </div>
        </SectionCard>

        <aside class="diary-aside">
          <SectionCard title="写在纸上">
            <p class="diary__hint">写下来的情绪，会变得不再沉重。</p>
            <div class="stack">
              <AppButton block :loading="saving" @click="save">{{ editing ? '保存修改' : '保存手记' }}</AppButton>
              <AppButton v-if="editing" variant="danger" block @click="deleteOpen = true">删除手记</AppButton>
              <AppButton variant="text" block @click="router.push('/mind')">返回月历</AppButton>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>

    <ConfirmDialog
      :visible="deleteOpen"
      title="删除手记"
      message="删除这篇手记？相关功德会按日重新计算，此操作不可撤销。"
      confirm-label="删除"
      danger
      @confirm="removeDiary"
      @cancel="deleteOpen = false"
    />
  </div>
</template>

<style scoped>
.diary__draft {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.diary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sp-4);
}

@media (min-width: 1100px) {
  .diary-grid {
    grid-template-columns: minmax(0, 1fr) 240px;
    align-items: start;
  }
}

.diary__date {
  height: 40px;
  padding: 0 var(--sp-3);
  border-radius: var(--r-input);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink);
  font-size: var(--fs-body);
}

.diary__counter {
  text-align: right;
  font-size: var(--fs-micro);
  color: var(--muted-2);
  margin-top: -8px;
}

.diary__emotions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.diary__intensity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.intensity-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--green);
  border: 2px solid transparent;
}

.intensity-dot--active {
  border-color: var(--green-deep);
  box-shadow: 0 0 0 2px rgba(79, 122, 98, 0.2);
}

.diary__intensity-label {
  font-size: var(--fs-note);
  color: var(--muted);
}

.diary-aside {
  position: sticky;
  top: calc(var(--header-h) + 8px);
}

.diary__hint {
  font-family: var(--font-serif);
  font-size: var(--fs-body);
  color: var(--text-2);
  line-height: 1.8;
  margin-bottom: var(--sp-3);
}
</style>