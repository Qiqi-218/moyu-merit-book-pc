import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { addDays } from '@shared/dateUtils'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { ServiceContext } from '../context'
import { createProfile } from '../profileService'
import { createEvent } from '../eventService'
import { batchArchive, batchReschedule, copyLastWeek } from '../instanceService'
import { weeklyReport, yearHeatmap } from '../insightsService'
import { createId } from '../../utils/id'

async function createContext(nowMs: number): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-insights-'))
    const store = new JsonStore(dir, '1.1.0', () => new Date(nowMs).toISOString())
    await store.load()
    const ctx = new ServiceContext(store, new BackupManager(dir), '1.1.0', 'build-time', () => undefined, () => nowMs)
    await createProfile(ctx, { nickname: '洞察测试', bio: '', dayBoundaryHour: 4, loadDemo: false, avatarSeed: 1 })
    return ctx
}

async function createTodoEvent(ctx: ServiceContext, title: string): Promise<string> {
    const created = await createEvent(ctx, {
        kind: 'todo',
        title,
        notes: '',
        tagId: 'health',
        frequency: 'once',
        targetValue: 1,
        targetUnit: 'times'
    })
    if (!created.ok) throw new Error('事件创建失败')
    const eventId = created.data.id
    await ctx.commit((draft) => {
        draft.instances = draft.instances.filter((item) => item.eventId !== eventId)
    })
    return eventId
}

async function seedInstance(ctx: ServiceContext, eventId: string, date: string, status: 'pending' | 'completed'): Promise<string> {
    const window = ctx.dayWindow(date)
    const id = createId()
    await ctx.commit((draft) => {
        draft.instances.push({
            id,
            eventId,
            businessDate: date,
            windowStart: window.start,
            windowEnd: window.end,
            timezone: 'Asia/Shanghai',
            dayBoundaryHour: draft.settings.dayBoundaryHour,
            status,
            targetValue: 1,
            targetUnit: 'times',
            completedAt: status === 'completed' ? ctx.nowIso() : null,
            createdAt: ctx.nowIso()
        })
    })
    return id
}

describe('insights 与批量整理', () => {
    it('周报在没有记录时为空且完成率为 0', async () => {
        const ctx = await createContext(Date.UTC(2026, 4, 10, 2, 0, 0))
        const report = weeklyReport(ctx)
        expect(report.ok).toBe(true)
        if (!report.ok) return
        expect(report.data.days.length).toBe(7)
        expect(report.data.mindfulnessTotal).toBe(0)
        expect(report.data.completionRate).toBe(0)
        expect(report.data.activeDays).toBe(0)
    })

    it('热力图覆盖已过去日期且无记录时连续天数为 0', async () => {
        const ctx = await createContext(Date.UTC(2026, 4, 10, 2, 0, 0))
        const heat = yearHeatmap(ctx, 2026)
        expect(heat.ok).toBe(true)
        if (!heat.ok) return
        expect(heat.data.totalDays).toBe(heat.data.cells.length)
        expect(heat.data.totalDays).toBeGreaterThan(100)
        expect(heat.data.currentStreak).toBe(0)
        expect(heat.data.longestStreak).toBe(0)
    })

    it('可顺延未完成、收起已完成并复制上周安排', async () => {
        const ctx = await createContext(Date.UTC(2026, 4, 10, 2, 0, 0))
        const today = ctx.today()
        const yesterday = addDays(today, -1)

        const pendingEvent = await createTodoEvent(ctx, '顺延事项')
        const pendingInstanceId = await seedInstance(ctx, pendingEvent, yesterday, 'pending')
        const rescheduled = await batchReschedule(ctx, { fromDate: yesterday, toDate: today })
        expect(rescheduled.ok).toBe(true)
        expect(rescheduled.ok ? rescheduled.data.affected : -1).toBe(1)
        const moved = ctx.instance(pendingInstanceId)
        expect(moved?.businessDate).toBe(today)
        expect(moved?.status).toBe('pending')

        const doneEvent = await createTodoEvent(ctx, '已完成事项')
        await seedInstance(ctx, doneEvent, yesterday, 'completed')
        const archived = await batchArchive(ctx, { beforeDate: today })
        expect(archived.ok).toBe(true)
        expect(archived.ok ? archived.data.affected : -1).toBe(1)
        expect(ctx.doc.instances.find((item) => item.eventId === doneEvent)?.status).toBe('shelved')

        const sourceEvent = await createTodoEvent(ctx, '上周事项')
        await seedInstance(ctx, sourceEvent, addDays(today, -7), 'completed')
        const copied = await copyLastWeek(ctx, { sourceDate: addDays(today, -7), targetDate: today })
        expect(copied.ok).toBe(true)
        expect(copied.ok ? copied.data.affected : -1).toBe(1)
        const copyTarget = ctx.doc.instances.find((item) => item.eventId === sourceEvent && item.businessDate === today)
        expect(copyTarget?.status).toBe('pending')
    })
})