import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'

const routes: RouteRecordRaw[] = [
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@/views/WelcomeView.vue'),
        meta: { bare: true, title: '首次入道' }
    },
    {
        path: '/lock',
        name: 'lock',
        component: () => import('@/views/LockView.vue'),
        meta: { bare: true, title: '解锁' }
    },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '修身' } },
    { path: '/events', name: 'events', component: () => import('@/views/EventsView.vue'), meta: { title: '修行事项' } },
    { path: '/events/new', name: 'event-new', component: () => import('@/views/EventEditView.vue'), meta: { title: '立一桩修行' } },
    { path: '/events/:id/edit', name: 'event-edit', component: () => import('@/views/EventEditView.vue'), meta: { title: '编辑修行事项' } },
    { path: '/timer', name: 'timer', component: () => import('@/views/TimerView.vue'), meta: { title: '番茄钟' } },
    { path: '/mind', name: 'mind', component: () => import('@/views/MindView.vue'), meta: { title: '修心' } },
    { path: '/mind/diary/new', name: 'diary-new', component: () => import('@/views/DiaryEditView.vue'), meta: { title: '写手记' } },
    { path: '/mind/diary/:id', name: 'diary-edit', component: () => import('@/views/DiaryEditView.vue'), meta: { title: '编辑手记' } },
    { path: '/records', name: 'records', component: () => import('@/views/RecordsView.vue'), meta: { title: '卷宗' } },
    { path: '/records/trends', name: 'trends', component: () => import('@/views/TrendView.vue'), meta: { title: '趋势分析' } },
    { path: '/records/archives', name: 'archives', component: () => import('@/views/ArchiveView.vue'), meta: { title: '修行归档' } },
    { path: '/self', name: 'self', component: () => import('@/views/SpiritView.vue'), meta: { title: '灵台' } },
    { path: '/self/achievements', name: 'achievements', component: () => import('@/views/AchievementsView.vue'), meta: { title: '成就称号' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '修行设置' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
    const app = useAppStore()
    await app.ensureBootstrap()
    if (!app.bootstrap) return true
    const hasProfile = app.hasProfile
    if (!hasProfile && to.path !== '/welcome') return { path: '/welcome' }
    if (hasProfile && to.path === '/welcome') return { path: app.isUnlocked ? '/' : '/lock' }
    if (hasProfile && app.lockRequired && !app.isUnlocked && to.path !== '/lock') return { path: '/lock' }
    if (to.path === '/lock' && !app.lockRequired) return { path: '/' }
    return true
})

export default router