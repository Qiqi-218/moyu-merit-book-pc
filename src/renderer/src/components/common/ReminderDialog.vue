<script setup lang="ts">
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const ui = useUiStore()

function close(): void {
  ui.closeReminder()
}

function goRecords(): void {
  close()
  void router.push('/records')
}

function goDiary(): void {
  close()
  void router.push('/mind/diary/new')
}

function goSettings(): void {
  close()
  void router.push('/settings')
}
</script>

<template>
  <Modal title="回顾时刻" :width="440" @close="close">
    <div class="reminder">
      <p class="reminder__lead serif">今天也辛苦了。</p>
      <p class="reminder__text">要不要花一分钟，看看今天的修行？不着急，一切都来得及。</p>
      <ul class="reminder__list">
        <li>· 结算今天，把行止落进卷宗</li>
        <li>· 或写一句手记，记下此刻的心情</li>
      </ul>
      <div class="reminder__actions">
        <AppButton variant="ghost" size="sm" @click="close">稍后</AppButton>
        <AppButton variant="secondary" size="sm" @click="goDiary">写手记</AppButton>
        <AppButton size="sm" @click="goRecords">去结算</AppButton>
      </div>
      <p class="reminder__hint">
        提醒时间可在
        <button type="button" class="reminder__link" @click="goSettings">修行设置</button>
        中调整或关闭
      </p>
    </div>
  </Modal>
</template>

<style scoped>
.reminder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.reminder__lead {
  font-size: var(--fs-card);
  color: var(--ink);
}

.reminder__text {
  font-size: var(--fs-body);
  line-height: 1.8;
  color: var(--text-2);
}

.reminder__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-3);
  border-radius: var(--r-btn);
  background: var(--green-soft);
  font-size: var(--fs-note);
  color: var(--green-deep);
}

.reminder__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-1);
  padding-top: var(--sp-2);
}

.reminder__hint {
  font-size: var(--fs-micro);
  color: var(--muted-2);
  text-align: right;
}

.reminder__link {
  color: var(--green-deep);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>