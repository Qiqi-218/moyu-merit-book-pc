<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SealAvatar from '@/components/common/SealAvatar.vue'
import AppButton from '@/components/common/AppButton.vue'
import TextInput from '@/components/common/TextInput.vue'
import Field from '@/components/common/Field.vue'
import Modal from '@/components/common/Modal.vue'
import { useAppStore } from '@/stores/app'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const app = useAppStore()
const ui = useUiStore()
const passphrase = ref('')
const error = ref('')
const shaking = ref(false)
const lockedUntil = ref(0)
const now = ref(Date.now())
const forgotOpen = ref(false)
const confirmText = ref('')
const clearing = ref(false)
let ticker: number | null = null

const nickname = computed(() => app.profile?.nickname ?? '修行者')
const seed = computed(() => app.profile?.avatarSeed ?? 1)
const countdown = computed(() => Math.max(0, Math.ceil((lockedUntil.value - now.value) / 1000)))
const locked = computed(() => countdown.value > 0)

async function refreshLock(): Promise<void> {
  const result = await window.moyu.profile.lockState()
  if (result.ok) lockedUntil.value = result.data.lockedUntil ? Date.parse(result.data.lockedUntil) : 0
}

async function submit(): Promise<void> {
  if (locked.value) return
  if (!passphrase.value) {
    error.value = '请输入口令'
    return
  }
  const result = await window.moyu.profile.verifyPassphrase({ passphrase: passphrase.value })
  if (result.ok) {
    app.markUnlocked()
    await router.push('/')
    return
  }
  error.value = result.error.message
  if (result.error.retryAfterMs) lockedUntil.value = Date.now() + result.error.retryAfterMs
  passphrase.value = ''
  shaking.value = true
  window.setTimeout(() => {
    shaking.value = false
  }, 220)
}

async function clearAll(): Promise<void> {
  if (confirmText.value !== '清空') {
    error.value = '请输入「清空」以确认'
    return
  }
  clearing.value = true
  try {
    const result = await window.moyu.backup.clearAll({ confirmText: '清空' })
    if (!result.ok) {
      ui.pushToast(result.error.message, result.error.hint)
      return
    }
    forgotOpen.value = false
    await app.refresh()
    await router.push('/welcome')
  } finally {
    clearing.value = false
  }
}

onMounted(async () => {
  await refreshLock()
  ticker = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (ticker !== null) window.clearInterval(ticker)
})
</script>

<template>
  <div class="lock">
    <div class="lock__card" :class="{ shake: shaking }">
      <SealAvatar :name="nickname" :seed="seed" :size="88" />
      <h1 class="page-title lock__name">{{ nickname }}</h1>
      <p class="lock__hint">灵台已锁，请以口令开启。</p>
      <Field label="口令" :error="error" for-id="lock-pass">
        <TextInput
          id="lock-pass"
          v-model="passphrase"
          type="password"
          placeholder="输入口令后回车"
          :maxlength="128"
          :invalid="Boolean(error)"
          @enter="submit"
        />
      </Field>
      <p v-if="locked" class="lock__countdown" role="status">已锁定，{{ countdown }} 秒后可再试</p>
      <AppButton block :disabled="locked" :loading="false" @click="submit">解锁</AppButton>
      <button type="button" class="lock__forgot" @click="forgotOpen = true">忘记口令？</button>
      <p class="lock__note">口令仅保存在本机，无法找回。</p>
    </div>

    <Modal v-if="forgotOpen" title="忘记口令" :width="460" @close="forgotOpen = false">
      <p class="lock__modal-text">
        口令无法找回。若确认继续，将清除本机全部修行数据并回到入道页。此操作不可撤销。
      </p>
      <Field label="输入「清空」以确认" :error="error">
        <TextInput v-model="confirmText" placeholder="清空" :maxlength="8" />
      </Field>
      <template #footer>
        <AppButton variant="text" @click="forgotOpen = false">取消</AppButton>
        <AppButton variant="danger" :loading="clearing" @click="clearAll">清除数据</AppButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.lock {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-8) var(--sp-4);
}

.lock__card {
  width: 400px;
  max-width: 100%;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  padding: var(--sp-6) var(--sp-5);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--sp-3);
  text-align: center;
}

.lock__name {
  margin-top: var(--sp-1);
}

.lock__hint {
  font-size: var(--fs-note);
  color: var(--muted);
  margin-bottom: var(--sp-2);
}

.lock__countdown {
  font-size: var(--fs-note);
  color: var(--danger);
}

.lock__forgot {
  align-self: center;
  font-size: var(--fs-note);
  color: var(--green-deep);
}

.lock__note {
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.lock__modal-text {
  margin-bottom: var(--sp-3);
  line-height: 1.8;
}
</style>