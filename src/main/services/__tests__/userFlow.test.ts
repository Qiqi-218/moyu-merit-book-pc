import { randomUUID } from 'crypto'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import type { CreateProfileInput } from '@shared/types/dto'
import { displaySecondsOf } from '@shared/timerMath'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { ServiceContext } from '../context'
import { createProfile } from '../profileService'
import { createEvent } from '../eventService'
import { listByDate } from '../instanceService'
import { checkIn, revokeActivity } from '../activityService'
import { finishTimer, getTimerState, pauseTimer, recordTimer, resumeTimer, startTimer } from '../timerService'
import { createDiary } from '../diaryService'
import { runSettlement } from '../settlementService'

const BASE_TIME = Date.UTC(2026, 4, 10, 2, 0, 0)

async function makeContext(clock: { now: number }): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-flow-'))
    const store = new JsonStore(dir, '1.0.0', () => new Date(clock.now).toISOString())
    await store.load()
    return new ServiceContext(store, new BackupManager(dir), '1.0.0', 'build-time', () => undefined, () => clock.now)
}

const profileInput: CreateProfileInput = {
    nickname: '旅程测试',
    bio: '',
    dayBoundaryHour: 4,
    loadDemo: false,
    avatarSeed: 1
}

describe('真实用户旅程', () => {
    it('入道 → 立习惯 → 打卡与撤销 → 计时暂停继续 → 手记 → 结算', async () => {
        const clock = { now: BASE_TIME }
        const ctx = await makeContext(clock)

        const created = await createProfile(ctx, profileInput)
        expect(created.ok).toBe(true)
        expect(ctx.doc.activities.length).toBe(0)
        expect(ctx.doc.snapshots.length).toBe(0)

        const eventResult = await createEvent(ctx, {
            kind: 'habit',
            title: '喝水',
            notes: '',
            tagId: 'health',
            frequency: 'daily',
            targetValue: 2,
            targetUnit: 'times'
        })
        expect(eventResult.ok).toBe(true)

        const today = ctx.today()
        const instances = listByDate(ctx, today)
        expect(instances.ok).toBe(true)
        const instance = instances.ok ? instances.data[0] : null
        expect(instance).not.toBeNull()
        if (!instance) return

        const firstCheckIn = await checkIn(ctx, { instanceId: instance.id, requestId: randomUUID(), quantity: 1 })
        expect(firstCheckIn.ok).toBe(true)
        if (firstCheckIn.ok) {
            expect(firstCheckIn.data.instance?.progressValue).toBe(1)
            expect(firstCheckIn.data.dayTotals.mindfulnessDelta).toBeGreaterThan(0)
        }

        const secondCheckIn = await checkIn(ctx, { instanceId: instance.id, requestId: randomUUID(), quantity: 1 })
        expect(secondCheckIn.ok).toBe(true)
        if (secondCheckIn.ok) {
            expect(secondCheckIn.data.instance?.status).toBe('completed')
            expect(secondCheckIn.data.instance?.progressValue).toBe(2)
        }

        const deltaAfterComplete = ctx.dayNet(today)
        const secondActivityId = secondCheckIn.ok ? secondCheckIn.data.activity.id : ''
        expect(secondActivityId).not.toBe('')
        const revoked = await revokeActivity(ctx, { activityId: secondActivityId, requestId: randomUUID() })
        expect(revoked.ok).toBe(true)
        expect(ctx.dayNet(today).mindfulness).toBeLessThan(deltaAfterComplete.mindfulness)
        expect(ctx.instance(instance.id)?.status).not.toBe('completed')

        const started = await startTimer(ctx, { mode: 'countdown', purpose: 'focus', plannedMinutes: 25 })
        expect(started.ok).toBe(true)

        clock.now += 65_000
        const paused = await pauseTimer(ctx)
        expect(paused.ok).toBe(true)
        const pausedRemaining = paused.ok && paused.data.active ? displaySecondsOf(paused.data.active, clock.now) : -1
        expect(pausedRemaining).toBe(1500 - 65)

        clock.now += 180_000
        const resumed = await resumeTimer(ctx)
        expect(resumed.ok).toBe(true)
        const resumedRemaining = resumed.ok && resumed.data.active ? displaySecondsOf(resumed.data.active, clock.now) : -1
        expect(resumedRemaining).toBe(1500 - 65)

        clock.now += 10_000
        const afterResume = getTimerState(ctx)
        expect(afterResume.ok).toBe(true)
        const liveRemaining = afterResume.ok && afterResume.data.active ? displaySecondsOf(afterResume.data.active, clock.now) : -1
        expect(liveRemaining).toBe(1500 - 75)

        clock.now += 5_000
        const finished = await finishTimer(ctx)
        expect(finished.ok).toBe(true)
        expect(finished.ok ? finished.data.session.accumulatedSeconds : -1).toBe(80)

        const recorded = await recordTimer(ctx, finished.ok ? finished.data.session.id : '')
        expect(recorded.ok).toBe(true)
        expect(ctx.doc.activities.some((item) => item.kind === 'timer' && item.purpose === 'focus')).toBe(true)

        const diary = await createDiary(ctx, {
            businessDate: today,
            content: '今天按部就班地完成了计划，也允许自己休息了一会儿。'.repeat(4),
            tagIds: ['emotion-calm'],
            intensity: 3
        })
        expect(diary.ok).toBe(true)

        const settlement = await runSettlement(ctx, today)
        expect(settlement.ok).toBe(true)
        if (settlement.ok) {
            expect(settlement.data.snapshot.businessDate).toBe(today)
            expect(settlement.data.snapshot.mindfulnessDelta).toBeGreaterThan(0)
            expect(settlement.data.verdict.status).toBe('generated')
        }

        const totalBefore = ctx.totals()
        const secondSettlement = await runSettlement(ctx, today)
        expect(secondSettlement.ok).toBe(true)
        expect(ctx.totals().mindfulness).toBe(totalBefore.mindfulness)
        expect(ctx.totals().freedom).toBe(totalBefore.freedom)
    })

    it('空账户启动不会产生任何结算快照或判词', async () => {
        const clock = { now: BASE_TIME }
        const ctx = await makeContext(clock)
        await createProfile(ctx, profileInput)
        expect(ctx.doc.snapshots.length).toBe(0)
        expect(ctx.doc.verdicts.length).toBe(0)
        expect(ctx.doc.userAchievements.length).toBe(0)
    })
})