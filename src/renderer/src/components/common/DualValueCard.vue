<script setup lang="ts">
import Badge from './Badge.vue'

withDefaults(
  defineProps<{
    mindfulness: number
    freedom: number
    deltaM?: number
    deltaF?: number
    sample?: boolean
    large?: boolean
  }>(),
  { deltaM: 0, deltaF: 0, sample: false, large: false }
)
</script>

<template>
  <div class="dual" :class="{ 'dual--large': large }">
    <div class="dual__tile dual__tile--mindfulness">
      <span class="dual__bar" aria-hidden="true" />
      <div class="dual__head">
        <span class="dual__label">正念</span>
        <Badge v-if="sample" variant="sample">示例</Badge>
      </div>
      <div class="dual__value serif">
        {{ mindfulness }}<small>分</small>
      </div>
      <div class="dual__delta">今日 +{{ deltaM }}</div>
    </div>
    <div class="dual__tile dual__tile--freedom">
      <span class="dual__bar" aria-hidden="true" />
      <div class="dual__head">
        <span class="dual__label">逍遥</span>
        <Badge v-if="sample" variant="sample">示例</Badge>
      </div>
      <div class="dual__value serif">
        {{ freedom }}<small>分</small>
      </div>
      <div class="dual__delta">今日 +{{ deltaF }}</div>
    </div>
  </div>
</template>

<style scoped>
.dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4);
}

.dual__tile {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: var(--sp-5);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.dual__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.dual__tile--mindfulness .dual__bar {
  background: var(--green);
}

.dual__tile--freedom .dual__bar {
  background: var(--gold);
}

.dual__head {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.dual__label {
  font-size: var(--fs-note);
  color: var(--muted);
  letter-spacing: 0.08em;
}

.dual__value {
  margin-top: var(--sp-1);
  font-size: var(--fs-display);
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.dual__tile--mindfulness .dual__value {
  color: var(--green-deep);
}

.dual__tile--freedom .dual__value {
  color: var(--gold-deep);
}

.dual__value small {
  margin-left: 4px;
  font-size: var(--fs-note);
  color: var(--muted);
  font-weight: 400;
}

.dual__delta {
  margin-top: 2px;
  font-size: var(--fs-micro);
  color: var(--muted-2);
}

.dual--large .dual__value {
  font-size: 48px;
}

@media (max-width: 640px) {
  .dual {
    grid-template-columns: 1fr;
  }
}
</style>