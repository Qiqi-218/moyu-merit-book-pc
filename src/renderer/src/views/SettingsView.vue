<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import Segmented from '@/components/common/Segmented.vue'
import Field from '@/components/common/Field.vue'
import TextInput from '@/components/common/TextInput.vue'
import TextArea from '@/components/common/TextArea.vue'
import Select from '@/components/common/Select.vue'
import AppButton from '@/components/common/AppButton.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { DEFAULT_RULES } from '@shared/defaultRules'
import { TIMEZONE } from '@shared/constants'

const app = useAppStore()
const settingsStore = useSettingsStore()
const ui = useUiStore()

const settings = computed(() => settingsStore.settings)
const version = computed(() => app.version)
const profile = computed(() => app.profile)
const boundaryOptions = Array.from({ length: 24 }, (_, index) => ({ value: String(index), label: `${index} 点` }))
const themeOptions = [
  { value: 'paper', label: '宣纸' },
  { value: 'night', label: '夜读' }
]
const fontOptions = [
  { value: 'normal', label: '标准' },
  { value: 'large', label: '大' }
]

const profileForm = reactive({ nickname: '', bio: '', avatarSeed: 1 as 1 | 2 | 3 })
const profileError = ref('')
const passOpen = ref(false)
const passForm = reactive({ oldPassphrase: '', newPassphrase: '', confirm: '' })
const passError = ref('')
const clearPassOpen = ref(false)
const clearPassValue = ref('')
const clearDemoOpen = ref(false)
const clearAllOpen = ref(false)
const clearAllText = ref('')

const rulesVersion = computed(() => DEFAULT_RULES.rulesVersion)

function boolValue(key: 'motion' | 'sound' | 'closeToTray' | 'launchAtLogin' | 'miniTimerOnTop' | 'globalShortcuts' | 'autoSettleOnStart' | 'aiEnabled'): boolean {
  return settings.value?.[key] ?? false
}

async function patch(patch: Record<string, unknown>, silent = false): Promise<void> {
  await settingsStore.patch(patch, silent)
}

async function patchNotification(key: 'timer' | 'settlement' | 'title' | 'achievement', value: boolean): Promise<void> {
  await settingsStore.patch({ notifications: { [key]: value } })
}

async function saveProfile(): Promise<void> {
  profileError.value = ''
  if (profileForm.nickname.trim().length < 2) {
    profileError.value = '道号至少 2 个字'
    return
  }
  const success = await app.updateProfile({ nickname: profileForm.nickname.trim(), bio: profileForm.bio.trim(), avatarSeed: profileForm.avatarSeed })
  if (success) ui.pushToast('已保存')
  else profileError.value = '未能保存，请重试。'
}

async function changePassphrase(): Promise<void> {
  passError.value = ''
  if (passForm.newPassphrase.length < 8) {
    passError.value = '新口令至少 8 位'
    return
  }
  if (passForm.newPassphrase !== passForm.confirm) {
    passError.value = '两次口令不一致'
    return
  }
  const result = await window.moyu.profile.setPassphrase({
    oldPassphrase: passForm.oldPassphrase,
    newPassphrase: passForm.newPassphrase
  })
  if (!result.ok) {
    passError.value = result.error.message
    return
  }
  passOpen.value = false
  passForm.oldPassphrase = ''
  passForm.newPassphrase = ''
  passForm.confirm = ''
  ui.pushToast('门禁已更新', '下次启动需要输入口令。', 'success')
}

async function clearPassphrase(): Promise<void> {
  const result = await window.moyu.profile.clearPassphrase({ passphrase: clearPassValue.value, confirmText: '清空' })
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  clearPassOpen.value = false
  clearPassValue.value = ''
  ui.pushToast('已清除口令', '启动时不再需要解锁。', 'success')
}

async function openDataDir(): Promise<void> {
  await window.moyu.app.openDataDir()
}

async function openRules(): Promise<void> {
  await window.moyu.app.openRulesFile()
}

async function createBackup(): Promise<void> {
  const result = await window.moyu.backup.create()
  if (result && !result.canceled) ui.pushToast('完整备份已保存', result.path, 'success')
}

async function restoreBackup(): Promise<void> {
  const result = await window.moyu.backup.restore()
  if (result && !result.canceled) {
    ui.pushToast('已从备份恢复', '', 'success')
    await app.refresh()
  }
}

async function exportJson(): Promise<void> {
  const result = await window.moyu.backup.exportJson()
  if (result && !result.canceled) ui.pushToast('已导出 JSON', result.path ?? '', 'success')
}

async function importJson(): Promise<void> {
  const result = await window.moyu.backup.importJson()
  if (result && !result.canceled) {
    ui.pushToast('已导入', '', 'success')
    await app.refresh()
  }
}

async function clearDemo(): Promise<void> {
  clearDemoOpen.value = false
  const result = await window.moyu.backup.clearDemo(true)
  if (!result) return
  ui.pushToast('已清除示例数据', `重算 ${result.recalculatedDates.length} 天快照`, 'success')
  await app.refresh()
}

async function clearAll(): Promise<void> {
  if (clearAllText.value !== '清空') {
    ui.pushToast('请输入「清空」以确认')
    return
  }
  const result = await window.moyu.backup.clearAll({ confirmText: '清空' })
  if (!result.ok) {
    ui.pushToast(result.error.message, result.error.hint)
    return
  }
  clearAllOpen.value = false
  clearAllText.value = ''
  await app.refresh()
  ui.pushToast('数据已清除', '已回到入道页。', 'success')
}

onMounted(() => {
  if (profile.value) {
    profileForm.nickname = profile.value.nickname
    profileForm.bio = profile.value.bio
    profileForm.avatarSeed = profile.value.avatarSeed
  }
})
</script>

<template>
  <div>
    <PageHeader title="修行设置" subtitle="把道场调成你喜欢的样子">
      <template #actions>
        <Badge variant="muted">版本 {{ version?.appVersion ?? '1.0.0' }}</Badge>
      </template>
    </PageHeader>

    <div class="page-content page-content--narrow">
      <div class="stack">
        <SectionCard title="修行档案" subtitle="道号、简介与印章样式">
          <div class="settings-grid">
            <Field label="道号" required :error="profileError">
              <TextInput v-model="profileForm.nickname" :maxlength="64" />
            </Field>
            <Field label="印章样式">
              <Select v-model="profileForm.avatarSeed" :options="[{ value: '1', label: '方印' }, { value: '2', label: '圆印' }, { value: '3', label: '椭圆印' }]" aria-label="印章样式" />
            </Field>
          </div>
          <Field label="简介" hint="最多 200 字">
            <TextArea v-model="profileForm.bio" :maxlength="200" :rows="2" />
          </Field>
          <div class="settings-actions">
            <AppButton size="sm" @click="saveProfile">保存档案</AppButton>
            <AppButton size="sm" variant="ghost" @click="passOpen = true">{{ profile?.passHash ? '修改口令' : '设置口令' }}</AppButton>
            <AppButton v-if="profile?.passHash" size="sm" variant="danger" @click="clearPassOpen = true">清除口令</AppButton>
          </div>
        </SectionCard>

        <SectionCard title="时间与结算" subtitle="时区固定，日界线只影响之后的记录">
          <div class="settings-grid">
            <Field label="时区" hint="固定值，不可修改">
              <TextInput model-value="Asia/Shanghai" disabled />
            </Field>
            <Field label="日界线" hint="凌晨该点前归前一天">
              <Select
                :model-value="String(settings?.dayBoundaryHour ?? 4)"
                :options="boundaryOptions"
                aria-label="日界线"
                @update:model-value="patch({ dayBoundaryHour: Number($event) })"
              />
            </Field>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">启动时自动补结算</span><span class="switch-row__desc">只结算已经过去的日期</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('autoSettleOnStart')" @click="patch({ autoSettleOnStart: !boolValue('autoSettleOnStart') })">
              <span :class="{ 'switch__dot--on': boolValue('autoSettleOnStart') }" class="switch__dot" />
            </button>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">结算完成通知</span><span class="switch-row__desc">每日结算后发送系统通知</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="settings?.notifications.settlement ?? true" @click="patchNotification('settlement', !(settings?.notifications.settlement ?? true))">
              <span :class="{ 'switch__dot--on': settings?.notifications.settlement ?? true }" class="switch__dot" />
            </button>
          </div>
        </SectionCard>

        <SectionCard title="外观与体验">
          <div class="settings-grid">
            <Field label="主题">
              <Segmented :model-value="settings?.theme ?? 'paper'" :options="themeOptions" aria-label="主题" @update:model-value="patch({ theme: $event })" />
            </Field>
            <Field label="字号">
              <Segmented :model-value="settings?.fontSize ?? 'normal'" :options="fontOptions" aria-label="字号" @update:model-value="patch({ fontSize: $event })" />
            </Field>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">动效</span><span class="switch-row__desc">关闭后界面变化即时完成</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('motion')" @click="patch({ motion: !boolValue('motion') })">
              <span :class="{ 'switch__dot--on': boolValue('motion') }" class="switch__dot" />
            </button>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">音效</span><span class="switch-row__desc">计时结束的轻提示音</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('sound')" @click="patch({ sound: !boolValue('sound') })">
              <span :class="{ 'switch__dot--on': boolValue('sound') }" class="switch__dot" />
            </button>
          </div>
        </SectionCard>

        <SectionCard title="桌面行为">
          <div class="switch-row">
            <div><span class="switch-row__label">关闭窗口时最小化到托盘</span><span class="switch-row__desc">关闭后再次点击图标可回来</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('closeToTray')" @click="patch({ closeToTray: !boolValue('closeToTray') })">
              <span :class="{ 'switch__dot--on': boolValue('closeToTray') }" class="switch__dot" />
            </button>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">开机自启</span><span class="switch-row__desc">随系统登录启动</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('launchAtLogin')" @click="patch({ launchAtLogin: !boolValue('launchAtLogin') })">
              <span :class="{ 'switch__dot--on': boolValue('launchAtLogin') }" class="switch__dot" />
            </button>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">迷你计时器置顶</span><span class="switch-row__desc">小窗始终浮在其他窗口上方</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('miniTimerOnTop')" @click="patch({ miniTimerOnTop: !boolValue('miniTimerOnTop') })">
              <span :class="{ 'switch__dot--on': boolValue('miniTimerOnTop') }" class="switch__dot" />
            </button>
          </div>
          <div class="switch-row">
            <div><span class="switch-row__label">全局快捷键</span><span class="switch-row__desc">Ctrl+Shift+T 开始/暂停计时</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('globalShortcuts')" @click="patch({ globalShortcuts: !boolValue('globalShortcuts') })">
              <span :class="{ 'switch__dot--on': boolValue('globalShortcuts') }" class="switch__dot" />
            </button>
          </div>
        </SectionCard>

        <SectionCard title="数据" subtitle="所有数据仅存本机">
          <div class="settings-actions">
            <AppButton size="sm" variant="secondary" @click="openDataDir">打开数据目录</AppButton>
            <AppButton size="sm" variant="secondary" @click="createBackup">立即备份</AppButton>
            <AppButton size="sm" variant="secondary" @click="restoreBackup">从备份恢复</AppButton>
            <AppButton size="sm" variant="secondary" @click="exportJson">导出 JSON</AppButton>
            <AppButton size="sm" variant="secondary" @click="importJson">导入 JSON</AppButton>
            <AppButton size="sm" variant="ghost" @click="clearDemoOpen = true">清除示例数据</AppButton>
            <AppButton size="sm" variant="danger" @click="clearAllOpen = true">清除全部数据</AppButton>
          </div>
          <p class="settings-note">导入与恢复前会自动保留一份「导入前」快照。</p>
        </SectionCard>

        <SectionCard title="规则与 AI">
          <div class="settings-grid">
            <Field label="规则版本">
              <TextInput :model-value="rulesVersion" disabled />
            </Field>
            <Field label="规则文件">
              <AppButton size="sm" variant="secondary" @click="openRules">打开规则文件</AppButton>
            </Field>
          </div>
          <p class="settings-note">规则文件位于数据目录下 rules.json。如需恢复默认规则，删除该文件后重启应用即可。</p>
          <div class="switch-row">
            <div><span class="switch-row__label">AI 判词</span><span class="switch-row__desc">本版本未接入，仅作预留</span></div>
            <button type="button" class="switch" role="switch" :aria-checked="boolValue('aiEnabled')" @click="patch({ aiEnabled: !boolValue('aiEnabled') })">
              <span :class="{ 'switch__dot--on': boolValue('aiEnabled') }" class="switch__dot" />
            </button>
          </div>
        </SectionCard>

        <SectionCard title="关于">
          <div class="about-grid">
            <div><span class="about-label">版本</span><span>{{ version?.appVersion ?? '1.0.0' }}</span></div>
            <div><span class="about-label">构建时间</span><span>{{ version?.buildTime ?? '-' }}</span></div>
            <div><span class="about-label">Electron</span><span>{{ version?.electron ?? '-' }}</span></div>
            <div><span class="about-label">Chromium</span><span>{{ version?.chrome ?? '-' }}</span></div>
            <div><span class="about-label">Node</span><span>{{ version?.node ?? '-' }}</span></div>
            <div><span class="about-label">时区</span><span>{{ TIMEZONE }}</span></div>
          </div>
          <div class="shortcuts">
            <span v-for="item in ['Ctrl+1~4 切换页面', 'Ctrl+N 新建事项', 'Ctrl+Shift+D 写手记', 'Ctrl+Shift+T 开始/暂停计时', 'Ctrl+K 命令面板', 'Ctrl+F 搜索事项', 'F11 全屏']" :key="item">{{ item }}</span>
          </div>
          <p class="settings-note">数据仅存本机 · 无需联网 · 不催促，也不责备</p>
        </SectionCard>
      </div>
    </div>

    <Modal v-if="passOpen" :title="profile?.passHash ? '修改口令' : '设置口令'" :width="460" @close="passOpen = false">
      <div class="stack">
        <Field v-if="profile?.passHash" label="当前口令">
          <TextInput v-model="passForm.oldPassphrase" type="password" :maxlength="128" />
        </Field>
        <Field label="新口令" hint="8–128 位" :error="passError">
          <TextInput v-model="passForm.newPassphrase" type="password" :maxlength="128" :invalid="Boolean(passError)" />
        </Field>
        <Field label="确认新口令">
          <TextInput v-model="passForm.confirm" type="password" :maxlength="128" />
        </Field>
      </div>
      <template #footer>
        <AppButton variant="text" @click="passOpen = false">取消</AppButton>
        <AppButton @click="changePassphrase">保存</AppButton>
      </template>
    </Modal>

    <Modal v-if="clearPassOpen" title="清除口令" :width="440" @close="clearPassOpen = false">
      <Field label="当前口令" hint="清除后启动不再需要解锁">
        <TextInput v-model="clearPassValue" type="password" :maxlength="128" />
      </Field>
      <template #footer>
        <AppButton variant="text" @click="clearPassOpen = false">取消</AppButton>
        <AppButton variant="danger" @click="clearPassphrase">清除</AppButton>
      </template>
    </Modal>

    <Modal v-if="clearAllOpen" title="清除全部数据" :width="460" @close="clearAllOpen = false">
      <p class="settings-danger-text">此操作会清除本机全部修行数据，无法撤销。请输入「清空」以确认。</p>
      <TextInput v-model="clearAllText" placeholder="清空" :maxlength="8" />
      <template #footer>
        <AppButton variant="text" @click="clearAllOpen = false">取消</AppButton>
        <AppButton variant="danger" @click="clearAll">清除全部</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :visible="clearDemoOpen"
      title="清除示例数据"
      message="将删除载入的示例事项、行止与手记，并重算受影响日期的快照。这些记录会丢失。"
      confirm-label="清除示例"
      danger
      @confirm="clearDemo"
      @cancel="clearDemoOpen = false"
    />
  </div>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
  margin-bottom: var(--sp-2);
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-top: var(--sp-2);
}

.settings-note {
  margin-top: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--muted-2);
  line-height: 1.7;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
  border-top: 1px solid var(--line-soft);
}

.switch-row__label {
  display: block;
  font-size: var(--fs-body);
  color: var(--ink);
}

.switch-row__desc {
  display: block;
  font-size: var(--fs-micro);
  color: var(--muted);
}

.switch {
  width: 40px;
  height: 22px;
  border-radius: var(--r-pill);
  background: var(--line);
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background var(--t-fast) var(--ease);
}

.switch[aria-checked="true"] {
  background: var(--green);
}

.switch__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface);
  transition: transform var(--t-fast) var(--ease);
}

.switch__dot--on {
  transform: translateX(18px);
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-1) var(--sp-3);
  font-size: var(--fs-note);
  color: var(--text-2);
}

.about-label {
  display: inline-block;
  width: 84px;
  color: var(--muted);
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: var(--sp-3);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--line-soft);
  font-size: var(--fs-micro);
  color: var(--muted);
}

.settings-danger-text {
  margin-bottom: var(--sp-2);
  line-height: 1.8;
  color: var(--danger);
}

@media (max-width: 640px) {
  .settings-grid,
  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>