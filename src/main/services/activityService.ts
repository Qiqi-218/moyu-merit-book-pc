import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { ActivityResult, CheckInInput, RevokeInput } from '@shared/types/dto'
import type { Activity, ActivityKind, BusinessDate, ISODate, Instance, LedgerEntry, TimerPurpose } from '@shared/types/models'
import { isUuid } from '@shared/validators'
import { businessDateOf } from '../domain/businessDay'
import { buildActivityView, buildDayTotals, buildInstanceView, activityDateOf } from '../domain/aggregates'
import { computeProgress } from '../domain/progress'
import { computeScore, netOfEntries, round1 } from '../domain/scoring'
import { recalculateFrom } from '../domain/settlement'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'
import { evaluateAndUnlock } from './achievementService'

const inFlight = new Map<string, number>()

export interface RecordActivityParams {
    instance: Instance | null
    sourceKey: string
    kind: ActivityKind
    purpose: TimerPurpose | null
    quantity: number
    durationSeconds: number
    note: string | null
    occurredAt: ISODate
    scoreSource: 'habitCheckin' | 'focusTimer' | null
    units?: number
}

function hasCompletionLedger(entries: LedgerEntry[], instanceId: string): boolean {
    return entries.some(
        (item) => item.sourceId === instanceId && item.sourceType !== 'reversal' && (item.sourceType === 'todoCompleted' || item.sourceType === 'habitGoalBonus')
    )
}

function resultOf(ctx: ServiceContext, activity: Activity): ActivityResult {
    const instance = activity.instanceId ? ctx.instance(activity.instanceId) : null
    const ledger = ctx.doc.ledgerEntries.filter((item) => item.sourceId === activity.id || (instance && item.sourceId === instance.id && item.sourceType !== 'reversal' && item.createdAt === activity.createdAt))
    return {
        activity: buildActivityView(ctx.doc, activity),
        ledger,
        instance: instance ? buildInstanceView(ctx.doc, instance) : null,
        dayTotals: buildDayTotals(ctx.doc, instance?.businessDate ?? activityDateOf(activity, ctx.doc))
    }
}

export async function recordActivity(ctx: ServiceContext, params: RecordActivityParams): Promise<Result<ActivityResult>> {
    const existing = ctx.doc.activities.find((item) => item.sourceKey === params.sourceKey)
    if (existing) return ok(resultOf(ctx, existing))
    const lockKey = params.instance?.id ?? params.sourceKey
    const now = ctx.clock()
    const last = inFlight.get(lockKey) ?? 0
    if (now - last < 300) return fail('E_BUSY', '这笔记录还在处理中，请稍候')
    inFlight.set(lockKey, now)
    try {
        const outcome = await ctx.commit((draft) => {
            const duplicate = draft.activities.find((item) => item.sourceKey === params.sourceKey)
            if (duplicate) return { activityId: duplicate.id }
            const nowIso = ctx.nowIso()
            const instance = params.instance ? draft.instances.find((item) => item.id === params.instance?.id) ?? null : null
            const date: BusinessDate = instance?.businessDate ?? businessDateOf(params.occurredAt, draft.settings.dayBoundaryHour, draft.settings.timezone)
            const dayNet = netOfEntries(draft.ledgerEntries.filter((item) => item.businessDate === date))
            const activity: Activity = {
                id: createId(),
                instanceId: instance?.id ?? null,
                sourceKey: params.sourceKey,
                kind: params.kind,
                purpose: params.purpose,
                occurredAt: params.occurredAt,
                recordedAt: nowIso,
                quantity: params.quantity,
                durationSeconds: params.durationSeconds,
                note: params.note,
                demo: false,
                revokedAt: null,
                createdAt: nowIso
            }
            draft.activities.push(activity)

            const event = instance ? draft.events.find((item) => item.id === instance.eventId) ?? null : null
            const tag = event?.tagId ? draft.tags.find((item) => item.id === event.tagId) ?? null : null

            if (params.scoreSource) {
                const score = computeScore({
                    source: params.scoreSource,
                    units: params.units ?? 1,
                    tag,
                    dayNet,
                    rules: draft.rules
                })
                const entry = ctx.makeLedger(date, params.scoreSource, activity.id, score)
                draft.ledgerEntries.push(entry)
                dayNet.mindfulness = round1(dayNet.mindfulness + score.mindfulness)
                dayNet.freedom = round1(dayNet.freedom + score.freedom)
            }

            if (instance && event) {
                const instanceActivities = draft.activities.filter((item) => item.instanceId === instance.id)
                const progress = computeProgress(instance.targetUnit, instance.targetValue, instanceActivities)
                if (progress.value >= instance.targetValue) {
                    if (instance.status !== 'completed') {
                        instance.status = 'completed'
                        instance.completedAt = nowIso
                    }
                    if (event.kind !== 'principle' && !hasCompletionLedger(draft.ledgerEntries, instance.id)) {
                        const source = event.kind === 'todo' ? 'todoCompleted' : 'habitGoalBonus'
                        const bonus = computeScore({ source, tag, dayNet, rules: draft.rules })
                        draft.ledgerEntries.push(ctx.makeLedger(date, source, instance.id, bonus))
                    }
                } else if (instance.status !== 'shelved' && instance.status !== 'skipped') {
                    instance.status = progress.value > 0 ? 'inProgress' : 'pending'
                    instance.completedAt = null
                }
            }

            return { activityId: activity.id }
        })

        const activity = ctx.doc.activities.find((item) => item.id === outcome.activityId)
        if (!activity) return fail('E_INTERNAL')
        const date = activity.instanceId ? ctx.instance(activity.instanceId)?.businessDate : activityDateOf(activity, ctx.doc)
        if (date && ctx.doc.snapshots.some((item) => item.businessDate === date)) {
            await recalcSnapshots(ctx, date)
        }
        ctx.broadcast('activities', date)
        ctx.broadcast('instances', date)
        await evaluateAndUnlock(ctx)
        return ok(resultOf(ctx, activity))
    } catch (error) {
        return errorToFail('activity', error)
    } finally {
        inFlight.delete(lockKey)
    }
}

export async function checkIn(ctx: ServiceContext, input: CheckInInput): Promise<Result<ActivityResult>> {
    if (!isUuid(input.requestId)) return fail('E_VALIDATION', '请求标识格式不正确')
    const instance = ctx.instance(input.instanceId)
    if (!instance) return fail('E_NOT_FOUND', '没有找到这条课业')
    const event = ctx.event(instance.eventId)
    if (!event || event.deletedAt !== null) return fail('E_NOT_FOUND', '事项已不可用')
    if (event.kind === 'principle') return fail('E_FORBIDDEN', '原则只作参照，不能打卡')
    if (instance.status === 'shelved' || instance.status === 'skipped') return fail('E_VALIDATION', '请先取消搁置或跳过')
    if (instance.targetUnit === 'minutes' && !input.durationSeconds) {
        return fail('E_VALIDATION', '这件事以分钟计量，请使用计时')
    }
    const quantity = input.quantity !== undefined && input.quantity > 0 ? input.quantity : 1
    const durationSeconds = instance.targetUnit === 'minutes' ? Math.max(0, input.durationSeconds ?? 0) : 0
    const note = typeof input.note === 'string' ? input.note.slice(0, 500) : null
    return recordActivity(ctx, {
        instance,
        sourceKey: `ci:${input.requestId}`,
        kind: 'checkin',
        purpose: null,
        quantity,
        durationSeconds,
        note,
        occurredAt: ctx.nowIso(),
        scoreSource: event.kind === 'habit' ? 'habitCheckin' : null
    })
}

async function recalcSnapshots(ctx: ServiceContext, fromDate: BusinessDate): Promise<void> {
    await ctx.commit((draft) => {
        const result = recalculateFrom(draft.snapshots, draft.ledgerEntries, fromDate)
        draft.snapshots = result.snapshots
    })
}

export async function revokeActivity(ctx: ServiceContext, input: RevokeInput): Promise<Result<ActivityResult>> {
    if (!isUuid(input.requestId)) return fail('E_VALIDATION', '请求标识格式不正确')
    const activity = ctx.doc.activities.find((item) => item.id === input.activityId)
    if (!activity) return fail('E_NOT_FOUND', '没有找到这笔记录')
    if (activity.revokedAt !== null) return ok(resultOf(ctx, activity))
    try {
        const date = await ctx.commit((draft) => {
            const target = draft.activities.find((item) => item.id === input.activityId)
            if (!target) throw new Error('activity missing')
            const nowIso = ctx.nowIso()
            target.revokedAt = nowIso
            const instance = target.instanceId ? draft.instances.find((item) => item.id === target.instanceId) ?? null : null
            const businessDate = instance?.businessDate ?? businessDateOf(target.occurredAt, draft.settings.dayBoundaryHour, draft.settings.timezone)

            const originals = draft.ledgerEntries.filter((item) => item.sourceId === target.id && item.reversedBy === null && item.sourceType !== 'reversal')
            for (const original of originals) {
                const reversal: LedgerEntry = {
                    ...ctx.makeLedger(original.businessDate, 'reversal', original.id, {
                        mindfulness: -original.mindfulnessDelta,
                        freedom: -original.freedomDelta
                    })
                }
                draft.ledgerEntries.push(reversal)
                original.reversedBy = reversal.id
            }

            if (instance) {
                const instanceActivities = draft.activities.filter((item) => item.instanceId === instance.id)
                const progress = computeProgress(instance.targetUnit, instance.targetValue, instanceActivities)
                if (progress.value < instance.targetValue) {
                    const completionEntries = draft.ledgerEntries.filter(
                        (item) =>
                            item.sourceId === instance.id &&
                            item.reversedBy === null &&
                            item.sourceType !== 'reversal' &&
                            (item.sourceType === 'todoCompleted' || item.sourceType === 'habitGoalBonus')
                    )
                    for (const original of completionEntries) {
                        const reversal = ctx.makeLedger(original.businessDate, 'reversal', original.id, {
                            mindfulness: -original.mindfulnessDelta,
                            freedom: -original.freedomDelta
                        })
                        draft.ledgerEntries.push(reversal)
                        original.reversedBy = reversal.id
                    }
                    if (instance.status === 'completed') {
                        instance.status = progress.value > 0 ? 'inProgress' : 'pending'
                        instance.completedAt = null
                    }
                }
            }

            const result = recalculateFrom(draft.snapshots, draft.ledgerEntries, businessDate)
            draft.snapshots = result.snapshots
            return businessDate
        })
        ctx.broadcast('activities', date)
        ctx.broadcast('instances', date)
        ctx.broadcast('settlement', date)
        await evaluateAndUnlock(ctx)
        const refreshed = ctx.doc.activities.find((item) => item.id === input.activityId)
        return ok(resultOf(ctx, refreshed ?? activity))
    } catch (error) {
        return errorToFail('activity', error)
    }
}