<script setup lang="ts">
import { computed } from 'vue'

export interface StackedSlice {
  label: string
  value: number
  ratio: number
  color: string
}

const props = defineProps<{ slices: StackedSlice[] }>()

const ariaLabel = computed(() => `情绪分布条，${props.slices.map((item) => `${item.label} ${Math.round(item.ratio * 100)}%`).join('，')}`)
</script>

<template>
  <div class="stacked" role="img" :aria-label="ariaLabel">
    <span
      v-for="slice in slices"
      :key="slice.label"
      class="stacked__segment"
      :style="{ width: `${Math.max(0, slice.ratio * 100)}%`, background: slice.color }"
      :title="`${slice.label} · ${Math.round(slice.ratio * 100)}%`"
    />
  </div>
</template>

<style scoped>
.stacked {
  display: flex;
  width: 100%;
  height: 12px;
  border-radius: var(--r-pill);
  overflow: hidden;
  background: var(--line-soft);
}

.stacked__segment {
  height: 100%;
  transition: width var(--t-progress) var(--ease);
}
</style>