<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ cells: Array<{ date: string; count: number }> }>()

const max = computed(() => Math.max(1, ...props.cells.map((item) => item.count)))
const visible = computed(() => props.cells.slice(0, 14))
const ariaLabel = computed(() => `本周与上周记录热力格，共 ${props.cells.reduce((sum, item) => sum + item.count, 0)} 笔记录`)
</script>

<template>
  <div class="heat-grid" role="img" :aria-label="ariaLabel">
    <span
      v-for="cell in visible"
      :key="cell.date"
      class="heat-cell"
      :style="{ background: 'var(--green)', opacity: cell.count === 0 ? 0.08 : 0.2 + (cell.count / max) * 0.7 }"
      :title="`${cell.date} · ${cell.count} 笔记录`"
    />
    <span v-for="index in Math.max(0, 14 - visible.length)" :key="`empty-${index}`" class="heat-cell heat-cell--empty" />
  </div>
</template>

<style scoped>
.heat-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 24px;
  gap: 6px;
}

.heat-cell {
  border-radius: 6px;
  border: 1px solid var(--line-soft);
}

.heat-cell--empty {
  background: var(--surface-2);
  opacity: 0.5;
}
</style>