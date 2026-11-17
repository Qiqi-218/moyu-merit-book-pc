import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { DiaryInput, DiaryMonthView, DiarySaveResult, DiaryView, EmotionSlice } from '@shared/types/dto'
import type { BusinessDate, DataDocument, Diary, LedgerEntry } from '@shared/types/models'
import { monthStart, daysInMonth, addDays, compareDate } from '@shared/dateUtils'
import { buildDiaryView, buildDayTotals, emotionSlicesOf } from '../domain/aggregates'
import { computeScore, netOfEntries, round1 } from '../domain/scoring'
import { recalculateFrom } from '../domain/settlement'
import { validateDiaryContent, validateEmotionTagIds, validateIntensity, validateDayBoundary, isBusinessDate } from '@shared/validators'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'
import { rebuildVerdictForDate } from './settlementService'

function validate(ctx: ServiceContext, input: DiaryInput): string | null {
    const contentCheck = validateDiaryContent(input.content)
    if (!contentCheck.valid) return contentCheck.message ?? '内容不正确'
    const tagCheck = validateEmotionTagIds(input.tagIds)
    if (!tagCheck.valid) return tagCheck.message ?? '情绪标签不正确'
    const intensityCheck = validateIntensity(input.intensity)
    if (!intensityCheck.valid) return intensityCheck.message ?? '强度不正确'
    if (!isBusinessDate(input.businessDate)) return '日期格式不正确'
    if (input.businessDate > ctx.today()) return '日期不得晚于今天'
    for (const tagId of input.tagIds) {
        const tag = ctx.doc.tags.find((item) => item.id === tagId)
        if (!tag || tag.kind !== 'emotion') return '情绪标签不可用'
    }
    return null
}

export function listMonth(ctx: ServiceContext, year: number, month: number): Result<DiaryMonthView> {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return fail('E_VALIDATION', '月份不正确')
    const first = monthStart(year, month)
    const total = daysInMonth(year, month)
    const days: DiaryMonthView['days'] = []
    for (let i = 0; i < total; i += 1) {
        const date = addDays(first, i)
        const diaries = ctx.doc.diaries.filter((item) => item.deletedAt === null && item.businessDate === date)
        if (diaries.length === 0) continue
        const emotions: DiaryMonthView['days'][number]['emotions'] = []
        for (const diary of diaries) {
            for (const tagId of diary.tagIds) {
                if (emotions.some((item) => item.tagId === tagId)) continue
                const tag = ctx.doc.tags.find((item) => item.id === tagId)
                emotions.push({
                    tagId,
                    name: tag?.name ?? '情绪',
                    emoji: tag?.emoji ?? '🍃',
                    color: tag?.color ?? '#4F7A62',
                    softColor: tag?.softColor ?? '#E8F0E8'
                })
            }
        }
        days.push({
            businessDate: date,
            count: diaries.length,
            emotions: emotions.slice(0, 3),
            maxIntensity: Math.max(...diaries.map((item) => item.intensity))
        })
    }
    const monthDiaries = ctx.doc.diaries.filter((item) => item.deletedAt === null && item.businessDate >= first && item.businessDate < addDays(first, total))
    return ok({ days, distribution: emotionSlicesOf(ctx.doc, monthDiaries) })
}

export function listDate(ctx: ServiceContext, date: BusinessDate): Result<DiaryView[]> {
    if (!isBusinessDate(date)) return fail('E_VALIDATION', '日期格式不正确')
    const items = ctx.doc.diaries
        .filter((item) => item.deletedAt === null && item.businessDate === date)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    return ok(items.map((item) => buildDiaryView(ctx.doc, item)))
}

export function getDiary(ctx: ServiceContext, id: string): Result<DiaryView> {
    const diary = ctx.doc.diaries.find((item) => item.id === id && item.deletedAt === null)
    if (!diary) return fail('E_NOT_FOUND', '没有找到这篇手记')
    return ok(buildDiaryView(ctx.doc, diary))
}

function diaryEntriesOfDay(doc: DataDocument, date: BusinessDate): LedgerEntry[] {
    return doc.ledgerEntries.filter(
        (item) => item.businessDate === date && item.sourceType !== 'reversal' && item.reversedBy === null && (item.sourceType === 'diaryEntry' || item.sourceType === 'diaryLong')
    )
}

function rescoreDay(ctx: ServiceContext, draft: DataDocument, date: BusinessDate): { added: LedgerEntry[]; recalculated: BusinessDate[] } {
    const added: LedgerEntry[] = []
    for (const original of diaryEntriesOfDay(draft, date)) {
        const reversal = ctx.makeLedger(date, 'reversal', original.id, {
            mindfulness: -original.mindfulnessDelta,
            freedom: -original.freedomDelta
        })
        draft.ledgerEntries.push(reversal)
        original.reversedBy = reversal.id
        added.push(reversal)
    }
    const diaries = draft.diaries
        .filter((item) => item.deletedAt === null && item.businessDate === date)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    const limit = draft.rules.scoring.diaryScoredLimit
    let dayNet = netOfEntries(draft.ledgerEntries.filter((item) => item.businessDate === date))
    for (let index = 0; index < diaries.length; index += 1) {
        const diary = diaries[index]
        if (!diary || index >= limit) continue
        const tag = diary.tagIds.length > 0 ? draft.tags.find((item) => item.id === diary.tagIds[0]) ?? null : null
        const score = computeScore({ source: 'diaryEntry', tag, dayNet, rules: draft.rules })
        const entry = ctx.makeLedger(date, 'diaryEntry', diary.id, score)
        draft.ledgerEntries.push(entry)
        added.push(entry)
        dayNet = { mindfulness: round1(dayNet.mindfulness + score.mindfulness), freedom: round1(dayNet.freedom + score.freedom) }
        if (diary.content.length >= draft.rules.scoring.longDiaryThreshold) {
            const bonus = computeScore({ source: 'diaryLong', tag, dayNet, rules: draft.rules })
            const bonusEntry = ctx.makeLedger(date, 'diaryLong', diary.id, bonus)
            draft.ledgerEntries.push(bonusEntry)
            added.push(bonusEntry)
            dayNet = { mindfulness: round1(dayNet.mindfulness + bonus.mindfulness), freedom: round1(dayNet.freedom + bonus.freedom) }
        }
    }
    const recalculated = recalculateFrom(draft.snapshots, draft.ledgerEntries, date)
    draft.snapshots = recalculated.snapshots
    return { added, recalculated: recalculated.affectedDates }
}

export async function createDiary(ctx: ServiceContext, input: DiaryInput): Promise<Result<DiarySaveResult>> {
    const validationError = validate(ctx, input)
    if (validationError) return fail('E_VALIDATION', validationError)
    try {
        const outcome = await ctx.commit((draft) => {
            const now = ctx.nowIso()
            const diary: Diary = {
                id: createId(),
                businessDate: input.businessDate,
                content: input.content.trim(),
                tagIds: input.tagIds,
                intensity: input.intensity,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
                demo: false
            }
            draft.diaries.push(diary)
            const rescored = rescoreDay(ctx, draft, input.businessDate)
            delete draft.settings.drafts['diary:new']
            ctx.logChange('diary', diary.id, 'create', null, `${diary.businessDate} · ${diary.content.length} 字`)
            return { diary, ...rescored }
        })
        ctx.broadcast('diary', input.businessDate)
        await rebuildVerdictForDate(ctx, input.businessDate)
        const diary = ctx.doc.diaries.find((item) => item.id === outcome.diary.id)
        if (!diary) return fail('E_INTERNAL')
        return ok({
            diary: buildDiaryView(ctx.doc, diary),
            ledger: outcome.added,
            dayTotals: buildDayTotals(ctx.doc, input.businessDate),
            recalculatedDates: outcome.recalculated
        })
    } catch (error) {
        return errorToFail('diary', error)
    }
}

export async function updateDiary(ctx: ServiceContext, id: string, input: DiaryInput): Promise<Result<DiarySaveResult>> {
    const existing = ctx.doc.diaries.find((item) => item.id === id && item.deletedAt === null)
    if (!existing) return fail('E_NOT_FOUND', '没有找到这篇手记')
    const validationError = validate(ctx, input)
    if (validationError) return fail('E_VALIDATION', validationError)
    try {
        const outcome = await ctx.commit((draft) => {
            const diary = draft.diaries.find((item) => item.id === id)
            if (!diary) throw new Error('diary missing')
            const oldDate = diary.businessDate
            const dates = new Set<BusinessDate>([oldDate, input.businessDate])
            diary.businessDate = input.businessDate
            diary.content = input.content.trim()
            diary.tagIds = input.tagIds
            diary.intensity = input.intensity
            diary.updatedAt = ctx.nowIso()
            const added: LedgerEntry[] = []
            const recalculated: BusinessDate[] = []
            for (const date of dates) {
                const rescored = rescoreDay(ctx, draft, date)
                added.push(...rescored.added)
                recalculated.push(...rescored.recalculated)
            }
            ctx.logChange('diary', diary.id, 'update', null, `${diary.businessDate} · ${diary.content.length} 字`)
            return { diary, added, recalculated }
        })
        ctx.broadcast('diary', input.businessDate)
        await rebuildVerdictForDate(ctx, input.businessDate)
        const diary = ctx.doc.diaries.find((item) => item.id === id)
        if (!diary) return fail('E_INTERNAL')
        return ok({
            diary: buildDiaryView(ctx.doc, diary),
            ledger: outcome.added,
            dayTotals: buildDayTotals(ctx.doc, input.businessDate),
            recalculatedDates: [...new Set(outcome.recalculated)]
        })
    } catch (error) {
        return errorToFail('diary', error)
    }
}

export async function removeDiary(ctx: ServiceContext, id: string, confirm: boolean): Promise<Result<DiarySaveResult>> {
    if (confirm !== true) return fail('E_FORBIDDEN', '请先确认删除')
    const existing = ctx.doc.diaries.find((item) => item.id === id && item.deletedAt === null)
    if (!existing) return fail('E_NOT_FOUND', '没有找到这篇手记')
    try {
        const outcome = await ctx.commit((draft) => {
            const diary = draft.diaries.find((item) => item.id === id)
            if (!diary) throw new Error('diary missing')
            diary.deletedAt = ctx.nowIso()
            const rescored = rescoreDay(ctx, draft, diary.businessDate)
            ctx.logChange('diary', diary.id, 'delete', `${diary.businessDate}`, null)
            return { diary, ...rescored }
        })
        ctx.broadcast('diary', outcome.diary.businessDate)
        await rebuildVerdictForDate(ctx, outcome.diary.businessDate)
        return ok({
            diary: buildDiaryView(ctx.doc, outcome.diary),
            ledger: outcome.added,
            dayTotals: buildDayTotals(ctx.doc, outcome.diary.businessDate),
            recalculatedDates: outcome.recalculated
        })
    } catch (error) {
        return errorToFail('diary', error)
    }
}

export function getDraft(ctx: ServiceContext, scope: string): Result<import('@shared/types/models').DraftPayload | null> {
    return ok(ctx.doc.settings.drafts[scope] ?? null)
}

export async function saveDraft(ctx: ServiceContext, scope: string, payload: import('@shared/types/models').DraftPayload): Promise<Result<{ savedAt: string }>> {
    try {
        const savedAt = ctx.nowIso()
        await ctx.commit((draft) => {
            draft.settings.drafts[scope] = { ...payload, savedAt }
        })
        return ok({ savedAt })
    } catch (error) {
        return errorToFail('diary', error)
    }
}

export async function clearDraft(ctx: ServiceContext, scope: string): Promise<Result<void>> {
    try {
        await ctx.commit((draft) => {
            delete draft.settings.drafts[scope]
        })
        return ok(undefined)
    } catch (error) {
        return errorToFail('diary', error)
    }
}

export function distributionOf(ctx: ServiceContext, year: number, month: number): EmotionSlice[] {
    const first = monthStart(year, month)
    const total = daysInMonth(year, month)
    const items = ctx.doc.diaries.filter((item) => item.deletedAt === null && item.businessDate >= first && item.businessDate < addDays(first, total))
    return emotionSlicesOf(ctx.doc, items)
}

export function sortDiaries(items: Diary[]): Diary[] {
    return [...items].sort((a, b) => compareDate(b.businessDate, a.businessDate) || (a.createdAt < b.createdAt ? -1 : 1))
}

export { validateDayBoundary }