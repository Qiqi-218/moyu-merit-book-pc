<script setup lang="ts">
withDefaults(defineProps<{ height?: string }>(), { height: '220px' })
</script>

<template>
  <svg
    :style="{ height, width: '100%', color: 'var(--green)' }"
    viewBox="0 0 900 220"
    preserveAspectRatio="xMidYMax slice"
    role="img"
    aria-label="水墨远山与一叶扁舟"
  >
    <defs>
      <linearGradient id="moyu-mist" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0.02" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0.12" />
      </linearGradient>
    </defs>
    <rect width="900" height="220" fill="url(#moyu-mist)" />
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-20 190 C 90 150, 150 168, 220 138 S 340 108, 410 142 S 520 176, 600 138 S 760 108, 920 160 L 920 220 L -20 220 Z" stroke-opacity="0.08" stroke-width="2" />
      <path d="M-20 205 C 110 172, 190 196, 280 164 S 420 130, 500 166 S 640 196, 740 162 S 860 138, 920 170 L 920 220 L -20 220 Z" stroke-opacity="0.14" stroke-width="2" />
      <path d="M-20 220 C 120 190, 230 212, 330 184 S 470 156, 560 190 S 720 214, 920 184 L 920 220 Z" fill="currentColor" fill-opacity="0.1" stroke-opacity="0.22" stroke-width="2" />
      <path d="M90 220 C 150 196, 210 206, 260 190" stroke-opacity="0.18" stroke-width="1.5" />
      <path d="M600 220 C 660 200, 720 206, 780 188" stroke-opacity="0.14" stroke-width="1.5" />
      <path d="M628 168 q 26 -12 52 0 q -26 10 -52 0 Z" fill="currentColor" fill-opacity="0.16" stroke-opacity="0.4" stroke-width="1.5" />
      <path d="M654 168 v -14 l 10 6" stroke-opacity="0.35" stroke-width="1.5" />
      <path d="M420 70 q 5 -6 10 0 q 5 -6 10 0" stroke-opacity="0.25" stroke-width="1.5" />
      <path d="M470 58 q 5 -6 10 0 q 5 -6 10 0" stroke-opacity="0.2" stroke-width="1.5" />
      <path d="M505 84 q 4 -5 8 0 q 4 -5 8 0" stroke-opacity="0.18" stroke-width="1.5" />
    </g>
    <g fill="currentColor" fill-opacity="0.18">
      <circle cx="210" cy="60" r="12" />
      <circle cx="210" cy="60" r="22" fill-opacity="0.04" />
    </g>
  </svg>
</template>