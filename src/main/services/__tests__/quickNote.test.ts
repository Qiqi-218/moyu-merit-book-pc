import { randomUUID } from 'crypto'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { IPC } from '@shared/ipc'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { guardPayload } from '../../ipc/guard'
import { ServiceContext } from '../context'
import { createProfile } from '../profileService'
import { createEvent } from '../eventService'
import { checkIn } from '../activityService'
import { createDiary } from '../diaryService'

const BASE_TIME = Date.UTC(2026, 4, 10, 2, 0, 0)

async function createContext(): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-quick-note-'))
    const store = new JsonStore(dir, '1.1.0', () => new Date(BASE_TIME).toISOString())
    await store.load()
    const ctx = new ServiceContext(store, new BackupManager(dir), '1.1.0', 'build-time', () => undefined, () => BASE_TIME)
    await createProfile(ctx, { nickname: '速记测试', bio: '', dayBoundaryHour: 4, loadDemo: false, avatarSeed: 1 })
    return ctx
}

describe('速记（QuickNote）逻辑', () => {
    it('一句话手记可保存、带情绪标签并计入当日净额', async () => {
        const ctx = await createContext()
        const date = ctx.today()
        const result = await createDiary(ctx, {
            businessDate: date,
            content: '午后窗边坐了五分钟，心里安静下来。',
            tagIds: ['emotion-calm'],
            intensity: 3
        })
        expect(result.ok).toBe(true)
        expect(ctx.doc.diaries.length).toBe(1)
        expect(ctx.doc.diaries[0]?.tagIds).toEqual(['emotion-calm'])
        expect(ctx.dayNet(date).mindfulness).toBeGreaterThan(0)
    })

    it('空内容会被 IPC 守卫与服务层同时拒绝', async () => {
        const guardError = guardPayload(IPC.diaryCreate, { businessDate: '2026-05-10', content: '', tagIds: ['emotion-calm'], intensity: 3 })
        expect(guardError).not.toBeNull()

        const ctx = await createContext()
        const result = await createDiary(ctx, { businessDate: ctx.today(), content: '', tagIds: ['emotion-calm'], intensity: 3 })
        expect(result.ok).toBe(false)
        expect(ctx.doc.diaries.length).toBe(0)
    })

    it('情绪标签超过 3 个会被拒绝', async () => {
        const guardError = guardPayload(IPC.diaryCreate, {
            businessDate: '2026-05-10',
            content: '一句话',
            tagIds: ['emotion-calm', 'emotion-happy', 'emotion-tired', 'emotion-warm'],
            intensity: 3
        })
        expect(guardError).not.toBeNull()
    })

    it('速记面板的打卡路径可直接推进今日课业', async () => {
        const ctx = await createContext()
        const created = await createEvent(ctx, {
            kind: 'todo',
            title: '速记打卡',
            notes: '',
            tagId: 'health',
            frequency: 'once',
            targetValue: 1,
            targetUnit: 'times'
        })
        expect(created.ok).toBe(true)
        const instance = ctx.doc.instances.find((item) => item.businessDate === ctx.today())
        expect(instance).toBeTruthy()
        if (!instance) return
        const check = await checkIn(ctx, { instanceId: instance.id, requestId: randomUUID(), quantity: 1 })
        expect(check.ok).toBe(true)
        expect(ctx.instance(instance.id)?.status).toBe('completed')
        expect(ctx.dayNet(ctx.today()).mindfulness).toBeGreaterThan(0)
    })
})