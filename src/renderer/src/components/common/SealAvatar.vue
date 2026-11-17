<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; seed?: 1 | 2 | 3; size?: number }>(), { seed: 1, size: 96 })

const initial = computed(() => props.name.trim().slice(0, 1) || '德')
</script>

<template>
  <div
    class="seal-avatar"
    :class="`seal-avatar--seed${seed}`"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` }"
    role="img"
    :aria-label="`${name || '修行者'}的印章头像`"
  >
    <span>{{ initial }}</span>
  </div>
</template>

<style scoped>
.seal-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--green);
  color: var(--surface);
  border: 2px solid var(--green-deep);
  font-family: var(--font-serif);
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: none;
  box-shadow: inset 0 0 0 3px rgba(255, 253, 247, 0.25);
}

.seal-avatar--seed1 {
  border-radius: 6px;
}

.seal-avatar--seed2 {
  border-radius: 50%;
}

.seal-avatar--seed3 {
  border-radius: 50% / 38%;
}
</style>