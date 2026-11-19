import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { TimerFinishResult, TimerRecordResult, TimerStartInput, TimerState } from '@shared/types/dto'
import type { TimerSession } from '@shared/types/models'
import { EVENT_CHANNELS } from '@shared/ipc'
import { unitsOfFocus } from '../domain/scoring'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'
import { recordActivity } from './activityService'

const MAX_SECONDS = 86400

export function activeSession(ctx: ServiceContext): TimerSession | null {
    return ctx.doc.timerSessions.find((item) => item.status === 'running' || item.status === 'paused') ?? null
}

function elapsedOf(session: TimerSession, now: number): number {
    const base = Math.max(0, session.accumulatedSeconds)
    if (session.status !== 'running' || !session.resumedAt) return Math.floor(base)
    const running = Math.max(0, (now - Date.parse(session.resumedAt)) / 1000)
    return Math.floor(Math.min(MAX_SECONDS, base + running))
}

function stateOf(ctx: ServiceContext): TimerState {
    const session = activeSession(ctx)
    if (!session) return { active: null, miniWindowOpen: false }
    const elapsed = elapsedOf(session, ctx.clock())
    const instance = session.instanceId ? ctx.instance(session.instanceId) : null
    const event = instance ? ctx.event(instance.eventId) : null
    return {
        active: {
            id: session.id,
            mode: session.mode,
            purpose: session.purpose,
            status: session.status === 'paused' ? 'paused' : 'running',
            plannedSeconds: session.plannedSeconds,
            elapsedSeconds: elapsed,
            remainingSeconds: session.plannedSeconds ? Math.max(0, session.plannedSeconds - elapsed) : null,
            accumulatedSeconds: Math.floor(Math.max(0, session.accumulatedSeconds)),
            resumedAt: session.status === 'running' ? session.resumedAt : null,
            instanceId: session.instanceId,
            instanceTitle: event?.title ?? null,
            startedAt: session.startedAt
        },
        miniWindowOpen: false
    }
}

export function getTimerState(ctx: ServiceContext): Result<TimerState> {
    return ok(stateOf(ctx))
}

function broadcastState(ctx: ServiceContext): void {
    ctx.send(EVENT_CHANNELS.timerState, stateOf(ctx))
}

export async function startTimer(ctx: ServiceContext, input: TimerStartInput): Promise<Result<TimerState>> {
    if (activeSession(ctx)) return fail('E_BUSY', '已有计时进行中')
    if (input.mode === 'countdown') {
        const minutes = input.plannedMinutes ?? 25
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return fail('E_VALIDATION', '自定义时长应在 1–180 分钟之间')
    }
    if (input.instanceId) {
        const instance = ctx.instance(input.instanceId)
        if (!instance) return fail('E_NOT_FOUND', '没有找到这条课业')
    }
    try {
        const now = ctx.nowIso()
        const session: TimerSession = {
            id: createId(),
            instanceId: input.instanceId ?? null,
            mode: input.mode,
            purpose: input.purpose,
            plannedSeconds: input.mode === 'countdown' ? Math.round((input.plannedMinutes ?? 25) * 60) : null,
            status: 'running',
            startedAt: now,
            resumedAt: now,
            finishedAt: null,
            accumulatedSeconds: 0,
            recordedActivityId: null,
            demo: false
        }
        await ctx.commit((draft) => {
            draft.timerSessions.push(session)
        })
        broadcastState(ctx)
        return ok(stateOf(ctx))
    } catch (error) {
        return errorToFail('timer', error)
    }
}

export async function pauseTimer(ctx: ServiceContext): Promise<Result<TimerState>> {
    const session = activeSession(ctx)
    if (!session || session.status !== 'running') return fail('E_CONFLICT', '当前没有正在进行的计时')
    try {
        const elapsed = elapsedOf(session, ctx.clock())
        await ctx.commit((draft) => {
            const target = draft.timerSessions.find((item) => item.id === session.id)
            if (!target) throw new Error('timer missing')
            target.accumulatedSeconds = elapsed
            target.resumedAt = null
            target.status = 'paused'
        })
        broadcastState(ctx)
        return ok(stateOf(ctx))
    } catch (error) {
        return errorToFail('timer', error)
    }
}

export async function resumeTimer(ctx: ServiceContext): Promise<Result<TimerState>> {
    const session = activeSession(ctx)
    if (!session || session.status !== 'paused') return fail('E_CONFLICT', '当前没有已暂停的计时')
    try {
        const now = ctx.nowIso()
        await ctx.commit((draft) => {
            const target = draft.timerSessions.find((item) => item.id === session.id)
            if (!target) throw new Error('timer missing')
            target.status = 'running'
            target.resumedAt = now
        })
        broadcastState(ctx)
        return ok(stateOf(ctx))
    } catch (error) {
        return errorToFail('timer', error)
    }
}

export async function finishTimer(ctx: ServiceContext): Promise<Result<TimerFinishResult>> {
    const session = activeSession(ctx)
    if (!session) return fail('E_CONFLICT', '当前没有可结束的计时')
    try {
        const elapsed = Math.min(MAX_SECONDS, elapsedOf(session, ctx.clock()))
        const now = ctx.nowIso()
        const finished = await ctx.commit((draft) => {
            const target = draft.timerSessions.find((item) => item.id === session.id)
            if (!target) throw new Error('timer missing')
            target.status = 'finished'
            target.finishedAt = now
            target.accumulatedSeconds = elapsed
            target.resumedAt = null
            return target
        })
        const state: TimerFinishResult = {
            session: finished,
            focusMinutes: Math.round((elapsed / 60) * 10) / 10,
            canRecord: finished.recordedActivityId === null,
            defaultInstanceId: finished.instanceId
        }
        broadcastState(ctx)
        ctx.send(EVENT_CHANNELS.timerFinished, state)
        return ok(state)
    } catch (error) {
        return errorToFail('timer', error)
    }
}

export async function discardTimer(ctx: ServiceContext): Promise<Result<TimerState>> {
    const session = activeSession(ctx)
    if (!session) return fail('E_CONFLICT', '当前没有可放弃的计时')
    try {
        await ctx.commit((draft) => {
            const target = draft.timerSessions.find((item) => item.id === session.id)
            if (!target) throw new Error('timer missing')
            target.status = 'abandoned'
            target.resumedAt = null
            target.finishedAt = ctx.nowIso()
        })
        broadcastState(ctx)
        return ok(stateOf(ctx))
    } catch (error) {
        return errorToFail('timer', error)
    }
}

export async function recordTimer(ctx: ServiceContext, sessionId: string, instanceId?: string): Promise<Result<TimerRecordResult>> {
    const session = ctx.doc.timerSessions.find((item) => item.id === sessionId)
    if (!session) return fail('E_NOT_FOUND', '没有找到这次计时')
    if (session.status !== 'finished') return fail('E_CONFLICT', '计时尚未结束')
    if (session.recordedActivityId) return fail('E_CONFLICT', '这次计时已经记入过')
    const instance = instanceId ? ctx.instance(instanceId) : null
    if (instanceId && !instance) return fail('E_NOT_FOUND', '没有找到这条课业')
    const focus = session.purpose === 'focus'
    const result = await recordActivity(ctx, {
        instance: instance ?? null,
        sourceKey: `timer:${session.id}`,
        kind: 'timer',
        purpose: session.purpose,
        quantity: 1,
        durationSeconds: session.accumulatedSeconds,
        note: null,
        occurredAt: session.finishedAt ?? ctx.nowIso(),
        scoreSource: focus ? 'focusTimer' : null,
        units: focus ? unitsOfFocus(session.accumulatedSeconds) : 0
    })
    if (!result.ok) return result
    try {
        await ctx.commit((draft) => {
            const target = draft.timerSessions.find((item) => item.id === session.id)
            if (target) target.recordedActivityId = result.data.activity.id
        })
    } catch (error) {
        return errorToFail('timer', error)
    }
    return ok({
        activity: result.data.activity,
        ledger: result.data.ledger,
        instance: result.data.instance,
        dayTotals: result.data.dayTotals
    })
}

export async function recoverTimer(ctx: ServiceContext): Promise<void> {
    const session = activeSession(ctx)
    if (!session) return
    const now = ctx.clock()
    const invalid =
        session.accumulatedSeconds < 0 ||
        session.accumulatedSeconds > MAX_SECONDS ||
        (session.resumedAt !== null && Date.parse(session.resumedAt) > now) ||
        (session.status === 'running' && session.resumedAt === null)
    if (invalid) {
        try {
            await ctx.commit((draft) => {
                const target = draft.timerSessions.find((item) => item.id === session.id)
                if (target) {
                    target.status = 'abandoned'
                    target.resumedAt = null
                    target.finishedAt = ctx.nowIso()
                }
            })
        } catch {
            /* 恢复失败不阻断启动 */
        }
        return
    }
    broadcastState(ctx)
}

export { stateOf as timerStateOf }