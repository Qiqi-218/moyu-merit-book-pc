<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    role="img"
    aria-label="摸鱼功德簿印章"
    class="seal-mark"
    style="color: var(--green)"
  >
    <rect x="2.5" y="2.5" width="43" height="43" rx="3" fill="none" stroke="currentColor" stroke-width="2.4" />
    <path d="M11 13.5h26M11 20.5h26M11 27.5h26M11 34.5h26" stroke="currentColor" stroke-width="1" opacity="0.22" />
    <text
      x="24"
      y="33"
      text-anchor="middle"
      font-size="23"
      font-weight="600"
      font-family="'Songti SC','SimSun',serif"
      fill="currentColor"
    >
      德
    </text>
  </svg>
</template>