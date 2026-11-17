import { ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { AchievementUnlock, SettlementResult, SettlementStatus, SettleMissingResult, TitlePromotion } from '@shared/types/dto'
import type { BusinessDate, DataDocument, Snapshot, Verdict } from '@shared/types/models'
import { EVENT_CHANNELS } from '@shared/ipc'
import { compareDate } from '@shared/dateUtils'
import { buildSnapshot, entriesOfDate, latestSnapshotBefore, pendingSettlementDates, upsertSnapshot } from '../domain/settlement'
import { buildVerdict } from '../domain/verdict'
import { buildTitleState, detectPromotions } from '../domain/titles'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'
import { evaluateAndUnlock } from './achievementService'

function dominantTagId(doc: DataDocument, date: BusinessDate): string | null {
    const totals = new Map<string, number>()
    for (const entry of doc.ledgerEntries.filter((item) => item.businessDate === date && item.sourceType !== 'reversal')) {
        const activity = doc.activities.find((item) => item.id === entry.sourceId)
        const instance = activity?.instanceId ? doc.instances.find((item) => item.id === activity.instanceId) : doc.instances.find((item) => item.id === entry.sourceId)
        const event = instance ? doc.events.find((item) => item.id === instance.eventId) : null
        if (!event?.tagId) continue
        const weight = Math.abs(entry.mindfulnessDelta) + Math.abs(entry.freedomDelta)
        totals.set(event.tagId, (totals.get(event.tagId) ?? 0) + weight)
    }
    let best: string | null = null
    let bestValue = 0
    for (const [tagId, value] of totals) {
        if (value > bestValue || (value === bestValue && best !== null && tagId < best)) {
            best = tagId
            bestValue = value
        }
    }
    return best
}

function topEmotionTagId(doc: DataDocument, date: BusinessDate): string | null {
    const counters = new Map<string, number>()
    for (const diary of doc.diaries.filter((item) => item.businessDate === date && item.deletedAt === null)) {
        for (const tagId of diary.tagIds) counters.set(tagId, (counters.get(tagId) ?? 0) + 1)
    }
    let best: string | null = null
    let bestValue = 0
    for (const [tagId, value] of counters) {
        if (value > bestValue) {
            best = tagId
            bestValue = value
        }
    }
    return best
}

function upsertVerdict(verdicts: Verdict[], next: Verdict): Verdict[] {
    const exists = verdicts.some((item) => item.businessDate === next.businessDate)
    if (exists) return verdicts.map((item) => (item.businessDate === next.businessDate ? next : item))
    return [...verdicts, next]
}

export function settlementStatus(ctx: ServiceContext): Result<SettlementStatus> {
    const today = ctx.today()
    const pending = pendingSettlementDates(ctx.doc.ledgerEntries, ctx.doc.snapshots, today)
    let latest: BusinessDate | null = null
    for (const snapshot of ctx.doc.snapshots) {
        if (!latest || compareDate(snapshot.businessDate, latest) > 0) latest = snapshot.businessDate
    }
    return ok({ latestSettledDate: latest, pendingDates: pending, running: false })
}

export async function rebuildVerdictForDate(ctx: ServiceContext, date: BusinessDate): Promise<void> {
    const snapshot = ctx.doc.snapshots.find((item) => item.businessDate === date)
    if (!snapshot) return
    try {
        await ctx.commit((draft) => {
            const titles = buildTitleState(draft.rules.titles.mindfulness, draft.rules.titles.freedom, snapshot.mindfulnessTotal, snapshot.freedomTotal)
            const verdict = buildVerdict({
                rules: draft.rules,
                businessDate: date,
                profileId: ctx.profileId(),
                mindfulnessDelta: snapshot.mindfulnessDelta,
                freedomDelta: snapshot.freedomDelta,
                dominantTagId: dominantTagId(draft, date),
                topEmotionTagId: topEmotionTagId(draft, date),
                titleName: titles.mindfulness.name,
                createdAt: ctx.nowIso()
            })
            draft.verdicts = upsertVerdict(draft.verdicts, verdict)
        })
    } catch (error) {
        void errorToFail('settlement', error)
    }
}

export async function runSettlement(ctx: ServiceContext, businessDate?: BusinessDate): Promise<Result<SettlementResult>> {
    const date = businessDate ?? ctx.today()
    const startedAt = Date.now()
    try {
        const outcome = await ctx.commit((draft) => {
            const nowIso = ctx.nowIso()
            const previous = latestSnapshotBefore(draft.snapshots, date)
            const snapshot: Snapshot = buildSnapshot(date, entriesOfDate(draft.ledgerEntries, date), previous, nowIso)
            draft.snapshots = upsertSnapshot(draft.snapshots, snapshot)
            const titles = buildTitleState(draft.rules.titles.mindfulness, draft.rules.titles.freedom, snapshot.mindfulnessTotal, snapshot.freedomTotal)
            const verdict = buildVerdict({
                rules: draft.rules,
                businessDate: date,
                profileId: draft.profile?.id ?? 'anonymous',
                mindfulnessDelta: snapshot.mindfulnessDelta,
                freedomDelta: snapshot.freedomDelta,
                dominantTagId: dominantTagId(draft, date),
                topEmotionTagId: topEmotionTagId(draft, date),
                titleName: titles.mindfulness.name,
                createdAt: nowIso
            })
            draft.verdicts = upsertVerdict(draft.verdicts, verdict)
            const promotions = detectPromotions(draft.meta.lastPromotedTitle, titles)
            draft.meta.lastPromotedTitle = {
                mindfulness: Math.max(draft.meta.lastPromotedTitle.mindfulness, titles.mindfulness.level),
                freedom: Math.max(draft.meta.lastPromotedTitle.freedom, titles.freedom.level)
            }
            draft.meta.counters.settlementCount += 1
            ctx.logChange('settlement', date, 'settle', null, `正念 ${snapshot.mindfulnessDelta} · 逍遥 ${snapshot.freedomDelta}`)
            return { snapshot, verdict, promotions }
        })
        const unlocked: AchievementUnlock[] = await evaluateAndUnlock(ctx)
        const result: SettlementResult = {
            businessDate: date,
            snapshot: outcome.snapshot,
            verdict: outcome.verdict,
            promotions: outcome.promotions,
            unlocked,
            durationMs: Date.now() - startedAt
        }
        ctx.broadcast('settlement', date)
        ctx.send(EVENT_CHANNELS.settlementCompleted, result)
        for (const promotion of outcome.promotions) {
            ctx.send(EVENT_CHANNELS.titlePromoted, promotion)
        }
        return ok(result)
    } catch (error) {
        return errorToFail('settlement', error)
    }
}

export async function settleMissing(ctx: ServiceContext): Promise<Result<SettleMissingResult>> {
    const today = ctx.today()
    const pending = pendingSettlementDates(ctx.doc.ledgerEntries, ctx.doc.snapshots, today).filter((date) => compareDate(date, today) < 0)
    const settledDates: BusinessDate[] = []
    const failedDates: BusinessDate[] = []
    for (const date of pending) {
        const result = await runSettlement(ctx, date)
        if (result.ok) settledDates.push(date)
        else failedDates.push(date)
    }
    return ok({ settledDates, failedDates })
}

export function promotionsOf(result: SettlementResult): TitlePromotion[] {
    return result.promotions
}