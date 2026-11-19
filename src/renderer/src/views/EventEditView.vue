<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Segmented from '@/components/common/Segmented.vue'
import Field from '@/components/common/Field.vue'
import TextInput from '@/components/common/TextInput.vue'
import TextArea from '@/components/common/TextArea.vue'
import Select from '@/components/common/Select.vue'
import AppButton from '@/components/common/AppButton.vue'
import Badge from '@/components/common/Badge.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useEventsStore } from '@/stores/events'
import { useUiStore } from '@/stores/ui'
import type { EventInput, EventKind } from '@shared/types/dto'
import type { Frequency, TargetUnit } from '@shared/types/models'
import { validateEventTitle, validateNotes, validateTargetValue } from '@shared/validators'
import { EVENT_KIND_LABEL, TARGET_UNIT_LABEL } from '@shared/constants'

const route = useRoute()
const router = useRouter()
const events = useEventsStore()
const ui = useUiStore()

const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const editing = computed(() => Boolean(id.value))
const loading = ref(false)
const saving = ref(false)
const initialized = ref(false)
const dirty = ref(false)
const deleteOpen = ref(false)
const newTagOpen = ref(false)
const newTagName = ref('')
const tagRemoveOpen = ref(false)
const tagRemoveId = ref('')
const tagRemoveName = ref('')

const form = reactive({
  kind: 'todo' as EventKind,
  title: '',
  notes: '',
  tagId: '',
  frequency: 'daily' as Frequency,
  targetValue: '1',
  targetUnit: 'times' as TargetUnit
})
const errors = reactive({ title: '', notes: '', target: '' })

const kindOptions = [
  { value: 'todo', label: EVENT_KIND_LABEL['todo'] ?? '待办' },
  { value: 'habit', label: EVENT_KIND_LABEL['habit'] ?? '习惯' },
  { value: 'principle', label: EVENT_KIND_LABEL['principle'] ?? '原则' }
]

const frequencyOptions = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' }
]

const unitOptions = [
  { value: 'times', label: '次' },
  { value: 'minutes', label: '分钟' },
  { value: 'quantity', label: '数量' }
]

const tagOptions = computed(() => [
  { value: '', label: '不设标签' },
  ...events.tags.filter((item) => item.kind === 'activity').map((item) => ({ value: item.id, label: item.name }))
])

const preview = computed(() => {
  if (form.kind === 'principle') return '只作参照：不生成课业、不打卡、不计分'
  const frequencyText =
    form.kind === 'todo'
      ? '每日一个课业'
      : form.frequency === 'daily'
        ? '每日一个课业'
        : form.frequency === 'weekly'
          ? '每周一个课业'
          : '每月一个课业'
  return `将生成：${frequencyText} · 目标 ${form.targetValue || 0} ${TARGET_UNIT_LABEL[form.targetUnit] ?? ''}`
})

const targetHint = computed(() =>
  form.targetUnit === 'minutes' && Number(form.targetValue) > 0 && Number(form.targetValue) % 5 !== 0
    ? '分钟目标不是 5 的倍数，仍可保存。'
    : ''
)

onMounted(async () => {
  await events.loadTags()
  if (editing.value) {
    loading.value = true
    const result = await window.moyu.events.get(id.value)
    loading.value = false
    if (!result.ok) {
      ui.pushToast(result.error.message, result.error.hint)
      await router.push('/events')
      return
    }
    const event = result.data
    form.kind = event.kind
    form.title = event.title
    form.notes = event.notes
    form.tagId = event.tagId ?? ''
    form.frequency = event.frequency === 'once' ? 'daily' : event.frequency
    form.targetValue = String(event.targetValue)
    form.targetUnit = event.targetUnit
  }
  initialized.value = true
})

watch(
  form,
  () => {
    if (!initialized.value || saving.value) return
    dirty.value = true
  },
  { deep: true }
)

function validate(): boolean {
  errors.title = ''
  errors.notes = ''
  errors.target = ''
  const titleCheck = validateEventTitle(form.title)
  if (!titleCheck.valid) errors.title = titleCheck.message ?? '标题不正确'
  const notesCheck = validateNotes(form.notes)
  if (!notesCheck.valid) errors.notes = notesCheck.message ?? '备注不正确'
  if (form.kind !== 'principle') {
    const targetCheck = validateTargetValue(Number(form.targetValue))
    if (!targetCheck.valid) errors.target = targetCheck.message ?? '目标值不正确'
  }
  return !errors.title && !errors.notes && !errors.target
}

async function save(): Promise<void> {
  if (!validate()) return
  saving.value = true
  try {
    const input: EventInput = {
      kind: form.kind,
      title: form.title.trim(),
      notes: form.notes.trim(),
      tagId: form.tagId === '' ? null : form.tagId,
      frequency: form.kind === 'habit' ? form.frequency : form.kind === 'todo' ? 'once' : 'once',
      targetValue: form.kind === 'principle' ? 1 : Number(form.targetValue),
      targetUnit: form.kind === 'principle' ? 'times' : form.targetUnit
    }
    const result = editing.value ? await window.moyu.events.update(id.value, input) : await window.moyu.events.create(input)
    if (!result.ok) {
      ui.pushToast(result.error.message, result.error.hint)
      return
    }
    dirty.value = false
    ui.pushToast(editing.value ? '已保存' : '已立一桩修行', editing.value ? '修改仅对之后生成的课业生效' : '今日课业已同步生成', 'success')
    await events.load({ kind: input.kind, status: undefined, tagId: undefined, page: 1 })
    await router.push('/events')
  } finally {
    saving.value = false
  }
}

async function createTag(): Promise<void> {
  const name = newTagName.value.trim()
  if (name.length === 0) return
  const result = await window.moyu.tags.create({ kind: 'activity', name, mWeight: 0.5, fWeight: 0.5 })
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  await events.loadTags()
  form.tagId = result.data.id
  cancelNewTag()
}

function cancelNewTag(): void {
  newTagOpen.value = false
  newTagName.value = ''
}

const customTags = computed(() => events.tags.filter((item) => !item.builtin))

function askRemoveTag(id: string, name: string): void {
  tagRemoveId.value = id
  tagRemoveName.value = name
  tagRemoveOpen.value = true
}

async function confirmRemoveTag(): Promise<void> {
  const id = tagRemoveId.value
  tagRemoveOpen.value = false
  if (!id) return
  const result = await window.moyu.tags.remove(id)
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  if (form.tagId === id) form.tagId = ''
  ui.pushToast('标签已删除', '', 'success')
  await events.loadTags()
}

async function removeEvent(): Promise<void> {
  deleteOpen.value = false
  const result = await window.moyu.events.remove(id.value, true)
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  dirty.value = false
  ui.pushToast('事项已删除', '历史记录仍可在卷宗中追溯。')
  await router.push('/events')
}

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return window.confirm('还有未保存的修改，确定离开吗？')
})
</script>

<template>
  <div>
    <PageHeader :title="editing ? '编辑修行事项' : '立一桩修行'" subtitle="写下想做的事，剩下的交给日常" back>
      <template #actions>
        <Badge v-if="editing" variant="muted">{{ EVENT_KIND_LABEL[form.kind] }}</Badge>
      </template>
    </PageHeader>

    <div class="page-content page-content--form">
      <SectionCard :title="editing ? '事项详情' : '新的修行'">
        <div v-if="loading" class="edit__loading">正在读取…</div>
        <div v-else class="edit__form">
          <Field label="类型" hint="类型创建后不可修改">
            <div v-if="editing" class="edit__kind-static">{{ EVENT_KIND_LABEL[form.kind] }}</div>
            <Segmented v-else v-model="form.kind" :options="kindOptions" aria-label="事项类型" />
          </Field>

          <Field label="标题" required :error="errors.title" for-id="event-title">
            <TextInput id="event-title" v-model="form.title" placeholder="例如：读十页书" :maxlength="60" :invalid="Boolean(errors.title)" />
          </Field>

          <Field label="标签" hint="标签会参与功德系数计算">
            <div class="edit__tag-row">
              <Select v-model="form.tagId" :options="tagOptions" aria-label="选择行为标签" />
              <AppButton variant="ghost" size="sm" @click="newTagOpen = !newTagOpen">新建标签</AppButton>
            </div>
            <div v-if="newTagOpen" class="edit__new-tag">
              <TextInput v-model="newTagName" placeholder="标签名称" :maxlength="20" @enter="createTag" />
              <AppButton size="sm" @click="createTag">创建</AppButton>
              <AppButton variant="text" size="sm" @click="cancelNewTag">取消</AppButton>
            </div>
            <div v-if="customTags.length > 0" class="edit__custom-tags">
              <span class="edit__custom-label">自定义：</span>
              <span v-for="tag in customTags" :key="tag.id" class="edit__custom-chip">
                {{ tag.name }}
                <button type="button" class="edit__custom-remove" :aria-label="`删除标签 ${tag.name}`" @click="askRemoveTag(tag.id, tag.name)">×</button>
              </span>
            </div>
          </Field>

          <Field v-if="form.kind === 'habit'" label="频率">
            <Select v-model="form.frequency" :options="frequencyOptions" aria-label="选择习惯频率" />
          </Field>

          <div v-if="form.kind !== 'principle'" class="edit__target">
            <Field label="目标值" required :error="errors.target" :hint="targetHint" for-id="event-target">
              <TextInput id="event-target" v-model="form.targetValue" type="number" :invalid="Boolean(errors.target)" />
            </Field>
            <Field label="单位">
              <Select v-model="form.targetUnit" :options="unitOptions" aria-label="选择目标单位" />
            </Field>
          </div>

          <Field label="备注" :error="errors.notes" hint="最多 500 字">
            <TextArea v-model="form.notes" :maxlength="500" :rows="3" placeholder="写一点提醒自己的话…" :invalid="Boolean(errors.notes)" />
          </Field>

          <div class="edit__preview">
            <span class="edit__preview-label">预览</span>
            <span>{{ preview }}</span>
          </div>
        </div>
      </SectionCard>

      <div class="edit__actions">
        <AppButton v-if="editing" variant="danger" @click="deleteOpen = true">删除事项</AppButton>
        <span class="edit__spacer" />
        <AppButton variant="text" @click="router.push('/events')">取消</AppButton>
        <AppButton :loading="saving" @click="save">保存</AppButton>
      </div>
    </div>

    <ConfirmDialog
      :visible="deleteOpen"
      title="删除事项"
      message="确认删除这桩修行？事项会被软删除，历史记录仍保留在卷宗中。"
      confirm-label="删除"
      danger
      @confirm="removeEvent"
      @cancel="deleteOpen = false"
    />

    <ConfirmDialog
      :visible="tagRemoveOpen"
      title="删除标签"
      :message="`确认删除自定义标签「${tagRemoveName}」？该操作立即生效；正在使用此标签的事项不受影响，但它们将不再显示标签名。`"
      confirm-label="删除标签"
      danger
      @confirm="confirmRemoveTag"
      @cancel="tagRemoveOpen = false"
    />
  </div>
</template>

<style scoped>
.edit__form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.edit__kind-static {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-3);
  border-radius: var(--r-input);
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-2);
}

.edit__tag-row {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
}

.edit__tag-row :deep(.select-wrap) {
  flex: 1;
}

.edit__new-tag {
  display: flex;
  gap: var(--sp-2);
  margin-top: 6px;
}

.edit__custom-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.edit__custom-label {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.edit__custom-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 4px 1px 10px;
  border-radius: var(--r-pill);
  background: var(--green-soft);
  border: 1px solid var(--green-line);
  color: var(--green-deep);
  font-size: var(--fs-micro);
}

.edit__custom-remove {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--green-deep);
  font-size: 12px;
  line-height: 1;
}

.edit__custom-remove:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.edit__target {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: var(--sp-3);
}

.edit__preview {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--green-soft);
  color: var(--green-deep);
  font-size: var(--fs-note);
}

.edit__preview-label {
  font-size: var(--fs-micro);
  opacity: 0.7;
}

.edit__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-4);
}

.edit__spacer {
  flex: 1;
}

.edit__loading {
  padding: var(--sp-6);
  text-align: center;
  color: var(--muted);
}
</style>