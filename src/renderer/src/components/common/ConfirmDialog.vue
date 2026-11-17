<script setup lang="ts">
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{ visible: boolean; title?: string; message: string; confirmLabel?: string; danger?: boolean }>(),
  { title: '请确认', confirmLabel: '确认', danger: false }
)
const emit = defineEmits<{ (event: 'confirm'): void; (event: 'cancel'): void }>()
</script>

<template>
  <Modal v-if="visible" :title="title" :width="480" @close="emit('cancel')">
    <p class="confirm-message">{{ message }}</p>
    <template #footer>
      <AppButton variant="text" @click="emit('cancel')">取消</AppButton>
      <AppButton :variant="danger ? 'danger' : 'primary'" @click="emit('confirm')">{{ confirmLabel }}</AppButton>
    </template>
  </Modal>
</template>

<style scoped>
.confirm-message {
  font-size: var(--fs-body);
  line-height: 1.8;
  color: var(--text-2);
  white-space: pre-line;
}
</style>