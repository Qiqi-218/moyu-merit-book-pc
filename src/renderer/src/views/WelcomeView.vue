<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FarMountainSvg from '@/components/layout/FarMountainSvg.vue'
import SealLogo from '@/components/layout/SealLogo.vue'
import AppButton from '@/components/common/AppButton.vue'
import Field from '@/components/common/Field.vue'
import TextInput from '@/components/common/TextInput.vue'
import TextArea from '@/components/common/TextArea.vue'
import Select from '@/components/common/Select.vue'
import { useAppStore } from '@/stores/app'
import { validateBio, validateNickname, validatePassphrase } from '@shared/validators'
import type { CreateProfileInput } from '@shared/types/dto'

const router = useRouter()
const app = useAppStore()
const step = ref(1)
const submitting = ref(false)
const form = reactive({
  nickname: '',
  bio: '',
  passphrase: '',
  confirm: '',
  dayBoundaryHour: '4',
  loadDemo: true,
  avatarSeed: 1 as 1 | 2 | 3
})
const errors = reactive({ nickname: '', bio: '', passphrase: '', confirm: '', general: '' })

const boundaryOptions = Array.from({ length: 24 }, (_, index) => ({ value: String(index), label: `${index} 点` }))

function validateStep(): boolean {
  errors.nickname = ''
  errors.bio = ''
  errors.passphrase = ''
  errors.confirm = ''
  errors.general = ''
  if (step.value === 1) {
    const nicknameCheck = validateNickname(form.nickname)
    if (!nicknameCheck.valid) errors.nickname = nicknameCheck.message ?? '道号不正确'
    const bioCheck = validateBio(form.bio)
    if (!bioCheck.valid) errors.bio = bioCheck.message ?? '简介不正确'
  }
  if (step.value === 2 && form.passphrase.length > 0) {
    const passCheck = validatePassphrase(form.passphrase)
    if (!passCheck.valid) errors.passphrase = passCheck.message ?? '口令不正确'
    if (form.passphrase !== form.confirm) errors.confirm = '两次口令不一致'
  }
  return !errors.nickname && !errors.bio && !errors.passphrase && !errors.confirm
}

function next(): void {
  if (!validateStep()) return
  if (step.value < 3) step.value += 1
}

function prev(): void {
  if (step.value > 1) step.value -= 1
}

async function submit(): Promise<void> {
  if (!validateStep()) return
  submitting.value = true
  try {
    const input: CreateProfileInput = {
      nickname: form.nickname.trim(),
      bio: form.bio.trim(),
      dayBoundaryHour: Number(form.dayBoundaryHour),
      loadDemo: form.loadDemo,
      avatarSeed: form.avatarSeed
    }
    if (form.passphrase.length > 0) input.passphrase = form.passphrase
    const success = await app.createProfile(input)
    if (success) await router.push('/')
    else errors.general = '入道未能完成，请检查本地目录权限后重试。'
  } catch {
    errors.general = '入道未能完成，请重试；若持续出现，请打开数据目录查看日志。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="welcome">
    <div class="welcome__art"><FarMountainSvg height="180px" /></div>
    <div class="welcome__card">
      <header class="welcome__head">
        <div class="welcome__brand">
          <SealLogo :size="40" />
          <div>
            <h1 class="page-title">首次入道</h1>
            <p class="welcome__sub">愿你在忙碌的世界里，依然保持内心的柔软。</p>
          </div>
        </div>
        <div class="welcome__steps" aria-label="入道步骤">
          <span v-for="index in 3" :key="index" class="welcome__step" :class="{ 'welcome__step--active': step >= index }">{{ index }}</span>
        </div>
      </header>

      <div v-if="step === 1" class="welcome__body">
        <h2 class="card-title">立道号</h2>
        <p class="welcome__note">道号会显示在灵台与印章头像上，稍后仍可修改。</p>
        <Field label="道号" required :error="errors.nickname" for-id="nickname">
          <TextInput id="nickname" v-model="form.nickname" placeholder="例如：林间客" :maxlength="64" :invalid="Boolean(errors.nickname)" />
        </Field>
        <Field label="简介" :error="errors.bio" hint="可留白，最多 200 字">
          <TextArea v-model="form.bio" :maxlength="200" :rows="3" placeholder="想对自己说的一句话…" :invalid="Boolean(errors.bio)" />
        </Field>
        <Field label="印章样式">
          <div class="welcome__seeds">
            <button
              v-for="seed in ([1, 2, 3] as const)"
              :key="seed"
              type="button"
              class="seed-option"
              :class="{ 'seed-option--active': form.avatarSeed === seed }"
              :aria-label="`印章样式 ${seed}`"
              @click="form.avatarSeed = seed"
            >
              <span :class="`seed-option__shape seed-option__shape--${seed}`">{{ form.nickname.slice(0, 1) || '德' }}</span>
            </button>
          </div>
        </Field>
      </div>

      <div v-else-if="step === 2" class="welcome__body">
        <h2 class="card-title">设门禁（可选）</h2>
        <p class="welcome__note">仅保存在本机，用于解锁手记。若留空则启动直接进入。</p>
        <Field label="口令" :error="errors.passphrase" hint="8–128 位，仅你知晓">
          <TextInput v-model="form.passphrase" type="password" placeholder="可不填" :maxlength="128" :invalid="Boolean(errors.passphrase)" />
        </Field>
        <Field label="确认口令" :error="errors.confirm">
          <TextInput v-model="form.confirm" type="password" placeholder="再次输入" :maxlength="128" :invalid="Boolean(errors.confirm)" />
        </Field>
      </div>

      <div v-else class="welcome__body">
        <h2 class="card-title">启程</h2>
        <p class="welcome__note">再确认两处设置，就可以开始了。</p>
        <Field label="时区" hint="固定为 Asia/Shanghai">
          <TextInput model-value="Asia/Shanghai (UTC+8)" disabled />
        </Field>
        <Field label="日界线" hint="凌晨 4 点前仍算作前一天">
          <Select v-model="form.dayBoundaryHour" :options="boundaryOptions" aria-label="选择日界线" />
        </Field>
        <label class="welcome__check">
          <input v-model="form.loadDemo" type="checkbox" />
          <span>载入 14 天示例修行记录（用于演示图表与卷宗）</span>
        </label>
        <p v-if="errors.general" class="welcome__error" role="alert">{{ errors.general }}</p>
      </div>

      <footer class="welcome__foot">
        <AppButton v-if="step > 1" variant="text" @click="prev">上一步</AppButton>
        <span class="welcome__spacer" />
        <AppButton v-if="step < 3" @click="next">下一步</AppButton>
        <AppButton v-else :loading="submitting" @click="submit">入道</AppButton>
      </footer>
    </div>
    <p class="welcome__footnote">数据仅存本机 · 无需联网 · 不催促，也不责备</p>
  </div>
</template>

<style scoped>
.welcome {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: var(--sp-8);
}

.welcome__art {
  width: 100%;
  max-width: 900px;
  color: var(--green);
}

.welcome__card {
  width: 480px;
  max-width: calc(100vw - 48px);
  margin-top: -60px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  padding: var(--sp-5);
  animation: fade-in var(--t-base) var(--ease);
}

.welcome__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.welcome__brand {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
}

.welcome__sub {
  margin-top: 4px;
  font-size: var(--fs-note);
  color: var(--muted);
}

.welcome__steps {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.welcome__step {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--line);
  color: var(--muted-2);
  font-size: var(--fs-micro);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.welcome__step--active {
  background: var(--green);
  border-color: var(--green);
  color: var(--surface);
}

.welcome__body {
  margin-top: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.welcome__note {
  font-size: var(--fs-note);
  color: var(--muted);
}

.welcome__seeds {
  display: flex;
  gap: var(--sp-2);
}

.seed-option {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-btn);
  border: 1px solid var(--line);
  background: var(--surface-2);
}

.seed-option--active {
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(79, 122, 98, 0.15);
}

.seed-option__shape {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--green);
  color: var(--surface);
  font-family: var(--font-serif);
  border-radius: 5px;
}

.seed-option__shape--2 {
  border-radius: 50%;
}

.seed-option__shape--3 {
  border-radius: 50% / 38%;
}

.welcome__check {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-note);
  color: var(--text-2);
}

.welcome__error {
  color: var(--danger);
  font-size: var(--fs-note);
}

.welcome__foot {
  margin-top: var(--sp-5);
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.welcome__spacer {
  flex: 1;
}

.welcome__footnote {
  margin-top: var(--sp-3);
  font-size: var(--fs-micro);
  color: var(--muted-2);
}
</style>