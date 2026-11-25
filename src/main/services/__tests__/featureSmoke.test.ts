import { readFile, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { IPC } from '@shared/ipc'
import { addDays } from '@shared/dateUtils'
import { guardPayload } from '../../ipc/guard'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { ServiceContext } from '../context'
import { createProfile } from '../profileService'
import { createEvent } from '../eventService'
import { createDiary } from '../diaryService'
import { batchReschedule, copyLastWeek } from '../instanceService'
import { patchSettings } from '../settingsService'
import { weeklyReport, yearHeatmap } from '../insightsService'

const BASE_TIME = Date.UTC(2026, 4, 10, 2, 0, 0)

async function createContext(): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-smoke-'))
    const store = new JsonStore(dir, '1.1.0', () => new Date(BASE_TIME).toISOString())
    await store.load()
    const ctx = new ServiceContext(store, new BackupManager(dir), '1.1.0', 'build-time', () => undefined, () => BASE_TIME)
    await createProfile(ctx, { nickname: '冒烟测试', bio: '', dayBoundaryHour: 4, loadDemo: false, avatarSeed: 1 })
    return ctx
}

describe('六功能逐项冒烟', () => {
    it('功能1 修行周报：返回 7 天结构与概览指标', async () => {
        const ctx = await createContext()
        const result = weeklyReport(ctx)
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.data.days.length).toBe(7)
        expect(result.data.startDate).toBeTruthy()
        expect(result.data.endDate).toBe(ctx.today())
        console.log('[SMOKE-1] 周报 PASS', result.data.startDate, '→', result.data.endDate)
    })

    it('功能2 全局速记：手记与打卡均可操作', async () => {
        const ctx = await createContext()
        const date = ctx.today()
        const diary = await createDiary(ctx, { businessDate: date, content: '速记冒烟：一句话。', tagIds: ['emotion-calm'], intensity: 3 })
        const event = await createEvent(ctx, {
            kind: 'todo',
            title: '速记冒烟打卡',
            notes: '',
            tagId: 'health',
            frequency: 'once',
            targetValue: 1,
            targetUnit: 'times'
        })
        expect(diary.ok && event.ok).toBe(true)
        expect(ctx.doc.diaries.length).toBe(1)
        expect(ctx.doc.instances.some((item) => item.businessDate === date)).toBe(true)
        console.log('[SMOKE-2] 速记 PASS')
    })

    it('功能3 专注环境音：本地合成实现存在且不依赖外部资源', async () => {
        const source = await readFile(join(process.cwd(), 'src/renderer/src/composables/useAmbientSound.ts'), 'utf8')
        expect(source.includes('AudioContext')).toBe(true)
        expect(source.includes('createBufferSource')).toBe(true)
        expect(source.includes('http')).toBe(false)
        console.log('[SMOKE-3] 环境音 PASS')
    })

    it('功能4 年度热力图：返回全年格子与里程碑', async () => {
        const ctx = await createContext()
        const result = yearHeatmap(ctx, 2026)
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.data.cells.length).toBeGreaterThan(100)
        expect(result.data.totalDays).toBe(result.data.cells.length)
        expect(result.data.longestStreak).toBeGreaterThanOrEqual(0)
        console.log('[SMOKE-4] 热力图 PASS', result.data.totalDays, '天')
    })

    it('功能5 事项批量整理：顺延与复制可执行', async () => {
        const ctx = await createContext()
        const today = ctx.today()
        const rescheduled = await batchReschedule(ctx, { fromDate: today, toDate: today })
        const copied = await copyLastWeek(ctx, { sourceDate: addDays(today, -7), targetDate: today })
        expect(rescheduled.ok).toBe(true)
        expect(copied.ok).toBe(true)
        console.log('[SMOKE-5] 批量整理 PASS')
    })

    it('功能6 回顾提醒：可开启、可设置时间且非法值被拒', async () => {
        const ctx = await createContext()
        const enabled = await patchSettings(ctx, { reminderEnabled: true, reminderTime: '21:30' })
        expect(enabled.ok).toBe(true)
        expect(ctx.doc.settings.reminderEnabled).toBe(true)
        expect(ctx.doc.settings.reminderTime).toBe('21:30')
        expect(guardPayload(IPC.settingsPatch, { reminderTime: '21:30' })).toBeNull()
        expect(guardPayload(IPC.settingsPatch, { reminderTime: '25:99' })).not.toBeNull()
        const bad = await patchSettings(ctx, { reminderTime: '25:99' })
        expect(bad.ok).toBe(false)
        console.log('[SMOKE-6] 回顾提醒 PASS')
    })
})