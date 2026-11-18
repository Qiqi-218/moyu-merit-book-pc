<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import TitleBar from '@/components/layout/TitleBar.vue'
import SideBar from '@/components/layout/SideBar.vue'
import ToastStack from '@/components/common/ToastStack.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'
import { useAppStore } from '@/stores/app'
import { useTodayStore } from '@/stores/today'
import { useTimerStore } from '@/stores/timer'
import { useUiStore } from '@/stores/ui'
import { useAchievementsStore } from '@/stores/achievements'
import { useEventsStore } from '@/stores/events'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const today = useTodayStore()
const timer = useTimerStore()
const ui = useUiStore()
const achievements = useAchievementsStore()
const events = useEventsStore()

const bare = computed(() => Boolean(route.meta.bare))
const cleanups: Array<() => void> = []
let fullscreen = false

async function hydrateToday(): Promise<void> {
  await app.refresh()
  if (app.today) today.hydrate(app.today)
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null
  const typing = target ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) : false
  const mod = event.ctrlKey || event.metaKey
  if (mod && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    ui.openCommand()
    return
  }
  if (mod && !event.shiftKey && ['1', '2', '3', '4'].includes(event.key)) {
    event.preventDefault()
    const map: Record<string, string> = { '1': '/', '2': '/events', '3': '/timer', '4': '/mind' }
    const path = map[event.key]
    if (path) void router.push(path)
    return
  }
  if (mod && event.key.toLowerCase() === 'n') {
    event.preventDefault()
    void router.push('/events/new')
    return
  }
  if (mod && event.shiftKey && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    void router.push('/mind/diary/new')
    return
  }
  if (event.key === 'F11') {
    event.preventDefault()
    fullscreen = !fullscreen
    void window.moyu.window.setFullscreen(fullscreen)
    return
  }
  if (event.key === 'Escape') {
    if (ui.commandOpen) ui.closeCommand()
    return
  }
  if (typing) return
}

onMounted(async () => {
  await app.ensureBootstrap()
  if (app.today) today.hydrate(app.today)
  await timer.refresh()
  await achievements.load()

  cleanups.push(
    window.moyu.on.dataChanged((payload) => {
      if (payload.scope === 'instances' || payload.scope === 'activities') void today.load()
      if (payload.scope === 'events') void events.load()
      if (payload.scope === 'achievements') void achievements.load()
      if (payload.scope === 'settlement') void hydrateToday()
    }),
    window.moyu.on.timerState((state) => timer.hydrate(state)),
    window.moyu.on.settlementCompleted(async () => {
      await hydrateToday()
    }),
    window.moyu.on.titlePromoted((promotion) => {
      ui.pushToast('境界提升', promotion.line === 'mindfulness' ? '正念线更进一步' : '逍遥线更进一步', 'success')
    }),
    window.moyu.on.achievementUnlocked((list) => {
      if (list.length > 0) ui.pushToast('成就解锁', list.map((item) => item.name).join('、'), 'success')
    }),
    window.moyu.on.navigate((payload) => {
      void router.push(payload.route)
    }),
    window.moyu.on.windowState((state) => {
      fullscreen = state.fullscreen
    }),
    window.moyu.on.error((error) => {
      ui.pushToast(error.message, error.hint ?? '')
    })
  )
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  for (const cleanup of cleanups) cleanup()
  cleanups.length = 0
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app-shell">
    <TitleBar />
    <div class="app-body">
      <SideBar v-if="!bare" />
      <main class="main-area" aria-label="主内容区">
        <RouterView />
      </main>
    </div>

    <div v-if="app.error" class="error-banner" role="alert">
      <span>本地数据读取未完成：{{ app.error }}</span>
      <button type="button" class="error-banner__btn" @click="app.refresh()">重试</button>
      <button type="button" class="error-banner__btn" @click="window.moyu.app.openDataDir()">打开数据目录</button>
    </div>

    <ToastStack />
    <CommandPalette v-if="ui.commandOpen" />
  </div>
</template>

<style>
.page-content {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--sp-4) var(--content-pad) var(--sp-8);
}

.page-content--narrow {
  max-width: 960px;
}

.page-content--form {
  max-width: 720px;
}

.page-content--diary {
  max-width: 760px;
}
</style>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.main-area {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.error-banner {
  position: fixed;
  top: calc(var(--titlebar-h) + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 10px 16px;
  border-radius: var(--r-pill);
  background: var(--danger-soft);
  border: 1px solid var(--danger-line);
  color: var(--danger);
  font-size: var(--fs-note);
  box-shadow: var(--shadow-card);
}

.error-banner__btn {
  color: var(--danger);
  font-size: var(--fs-micro);
  text-decoration: underline;
}
</style>