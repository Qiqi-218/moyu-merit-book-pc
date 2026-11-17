import type {
    Activity,
    BusinessDate,
    DataDocument,
    Diary,
    Event,
    Instance,
    LedgerEntry,
    Snapshot,
    Tag,
    Verdict
} from '@shared/types/models'
import type {
    ActivityView,
    ArchiveDailyResult,
    ArchivePeriodResult,
    DailyArchiveCard,
    DailyDetail,
    DiaryEmotionMark,
    DiaryView,
    EmotionSlice,
    HistoryResult,
    HistoryRow,
    InstanceView,
    PeriodCard,
    RecordsOverview,
    SearchItem,
    SearchResult,
    TrendPoint,
    TrendQuery,
    TrendResult
} from '@shared/types/dto'
import { addDays, compareDate, dateRange, formatShortCN, parseDateParts, startOfMonthDate, startOfWeekMonday } from '@shared/dateUtils'
import { businessDateOf } from './businessDay'
import { computeProgress } from './progress'
import { latestSnapshot } from './settlement'
import { netOfEntries, round1 } from './scoring'

export function activityDateOf(activity: Activity, doc: DataDocument): BusinessDate {
    const instance = activity.instanceId ? doc.instances.find((item) => item.id === activity.instanceId) : null
    if (instance) return instance.businessDate
    return businessDateOf(activity.occurredAt, doc.settings.dayBoundaryHour, doc.settings.timezone)
}

export function activitiesOfInstance(doc: DataDocument, instanceId: string): Activity[] {
    return doc.activities.filter((item) => item.instanceId === instanceId)
}

export function buildInstanceView(doc: DataDocument, instance: Instance): InstanceView {
    const event = doc.events.find((item) => item.id === instance.eventId)
    const tag = event?.tagId ? doc.tags.find((item) => item.id === event.tagId) ?? null : null
    const activities = activitiesOfInstance(doc, instance.id)
    const progress = computeProgress(instance.targetUnit, instance.targetValue, activities)
    return {
        ...instance,
        eventTitle: event?.title ?? '已移除的事项',
        eventKind: event?.kind ?? 'todo',
        tagId: tag?.id ?? null,
        tagName: tag?.name ?? null,
        progressValue: progress.value,
        progressRatio: progress.ratio,
        overTarget: progress.overTarget
    }
}

export function buildDayTotals(doc: DataDocument, date: BusinessDate): {
    businessDate: BusinessDate
    mindfulnessDelta: number
    freedomDelta: number
    mindfulnessTotal: number
    freedomTotal: number
    settled: boolean
} {
    const entries = doc.ledgerEntries.filter((item) => item.businessDate === date)
    const net = netOfEntries(entries)
    const snapshot = doc.snapshots.find((item) => item.businessDate === date)
    const latest = latestSnapshot(doc.snapshots)
    const fallbackTotalM = snapshot?.mindfulnessTotal ?? latest?.mindfulnessTotal ?? 0
    const fallbackTotalF = snapshot?.freedomTotal ?? latest?.freedomTotal ?? 0
    return {
        businessDate: date,
        mindfulnessDelta: snapshot ? snapshot.mindfulnessDelta : net.mindfulness,
        freedomDelta: snapshot ? snapshot.freedomDelta : net.freedom,
        mindfulnessTotal: fallbackTotalM,
        freedomTotal: fallbackTotalF,
        settled: Boolean(snapshot)
    }
}

export function emotionMarkOf(doc: DataDocument, tagId: string): DiaryEmotionMark {
    const tag = doc.tags.find((item) => item.id === tagId)
    return {
        tagId,
        name: tag?.name ?? '情绪',
        emoji: tag?.emoji ?? '🍃',
        color: tag?.color ?? '#4F7A62',
        softColor: tag?.softColor ?? '#E8F0E8'
    }
}

export function buildDiaryView(doc: DataDocument, diary: Diary): DiaryView {
    return { ...diary, emotions: diary.tagIds.map((id) => emotionMarkOf(doc, id)) }
}

export function emotionSlicesOf(doc: DataDocument, diaries: Diary[]): EmotionSlice[] {
    const counters = new Map<string, number>()
    let total = 0
    for (const diary of diaries) {
        for (const tagId of diary.tagIds) {
            counters.set(tagId, (counters.get(tagId) ?? 0) + 1)
            total += 1
        }
    }
    const slices: EmotionSlice[] = []
    for (const [tagId, count] of counters) {
        const mark = emotionMarkOf(doc, tagId)
        slices.push({ ...mark, count, ratio: total > 0 ? count / total : 0 })
    }
    return slices.sort((a, b) => b.count - a.count)
}

export function buildActivityView(doc: DataDocument, activity: Activity): ActivityView {
    const instance = activity.instanceId ? doc.instances.find((item) => item.id === activity.instanceId) : null
    const event = instance ? doc.events.find((item) => item.id === instance.eventId) : null
    return {
        ...activity,
        eventTitle: event?.title ?? null,
        instanceBusinessDate: instance?.businessDate ?? null
    }
}

export function overviewOf(doc: DataDocument, date: BusinessDate): RecordsOverview {
    const snapshot = latestSnapshot(doc.snapshots)
    const dayTotals = buildDayTotals(doc, date)
    const sparkline14: RecordsOverview['sparkline14'] = []
    for (let i = 13; i >= 0; i -= 1) {
        const target = addDays(date, -i)
        const item = doc.snapshots.find((entry) => entry.businessDate === target)
        sparkline14.push({
            date: target,
            mindfulness: item?.mindfulnessTotal ?? 0,
            freedom: item?.freedomTotal ?? 0
        })
    }
    const todayActivities = doc.activities.filter((item) => item.revokedAt === null && activityDateOf(item, doc) === date)
    const todayDiaries = doc.diaries.filter((item) => item.deletedAt === null && item.businessDate === date)
    const focusMinutes = round1(
        todayActivities.filter((item) => item.kind === 'timer' && item.purpose === 'focus').reduce((sum, item) => sum + item.durationSeconds, 0) / 60
    )
    const restMinutes = round1(
        todayActivities.filter((item) => item.kind === 'timer' && item.purpose === 'rest').reduce((sum, item) => sum + item.durationSeconds, 0) / 60
    )
    const emotionKinds = new Set<string>()
    for (const diary of todayDiaries) for (const tagId of diary.tagIds) emotionKinds.add(tagId)

    return {
        businessDate: date,
        totals: { mindfulness: snapshot?.mindfulnessTotal ?? 0, freedom: snapshot?.freedomTotal ?? 0 },
        todayDelta: { mindfulness: dayTotals.mindfulnessDelta, freedom: dayTotals.freedomDelta },
        sparkline14,
        verdict: doc.verdicts.find((item) => item.businessDate === date) ?? null,
        todayStats: {
            records: todayActivities.length + todayDiaries.length,
            focusMinutes,
            restMinutes,
            emotionKinds: emotionKinds.size
        },
        demoFlag: doc.profile?.demoDataLoaded ?? false,
        settled: dayTotals.settled
    }
}

function focusMinutesOfDay(doc: DataDocument, date: BusinessDate, purpose: 'focus' | 'rest'): number {
    const seconds = doc.activities
        .filter((item) => item.revokedAt === null && item.kind === 'timer' && item.purpose === purpose && activityDateOf(item, doc) === date)
        .reduce((sum, item) => sum + item.durationSeconds, 0)
    return round1(seconds / 60)
}

export function trendOf(doc: DataDocument, query: TrendQuery): TrendResult {
    const dates = dateRange(query.rangeStart, query.rangeEnd)
    const kind = query.kind
    if (dates.length === 0) {
        return {
            kind,
            points: [],
            summary: { total: 0, avg: 0, max: 0, unit: '' },
            empty: true,
            emotionBreakdown: [],
            intensityPoints: []
        }
    }

    if (kind === 'focus' || kind === 'rest') {
        const points: TrendPoint[] = dates.map((date) => ({
            date,
            value: round1(focusMinutesOfDay(doc, date, kind) / 60)
        }))
        const total = round1(points.reduce((sum, item) => sum + item.value, 0))
        const max = points.reduce((acc, item) => Math.max(acc, item.value), 0)
        return {
            kind,
            points,
            summary: { total, avg: round1((total * 60) / dates.length), max: round1(max), unit: '小时' },
            empty: total === 0,
            emotionBreakdown: [],
            intensityPoints: []
        }
    }

    if (kind === 'emotion') {
        const diaries = doc.diaries.filter((item) => item.deletedAt === null && item.businessDate >= query.rangeStart && item.businessDate <= query.rangeEnd)
        const points: TrendPoint[] = dates.map((date) => ({ date, value: diaries.filter((item) => item.businessDate === date).length }))
        const intensityPoints: TrendPoint[] = []
        for (const date of dates) {
            const list = diaries.filter((item) => item.businessDate === date)
            if (list.length > 0) {
                intensityPoints.push({ date, value: round1(list.reduce((sum, item) => sum + item.intensity, 0) / list.length) })
            }
        }
        const total = diaries.length
        return {
            kind: 'emotion',
            points,
            summary: { total, avg: round1(total / dates.length), max: points.reduce((acc, item) => Math.max(acc, item.value), 0), unit: '篇' },
            empty: total === 0,
            emotionBreakdown: emotionSlicesOf(doc, diaries),
            intensityPoints
        }
    }

    const mindfulness: TrendPoint[] = []
    const freedom: TrendPoint[] = []
    for (const date of dates) {
        const snapshot = doc.snapshots.find((item) => item.businessDate === date)
        mindfulness.push({ date, value: snapshot?.mindfulnessTotal ?? 0 })
        freedom.push({ date, value: snapshot?.freedomTotal ?? 0 })
    }
    const last = mindfulness[mindfulness.length - 1]
    const lastF = freedom[freedom.length - 1]
    return {
        kind: 'values',
        points: mindfulness,
        summary: { total: last?.value ?? 0, avg: lastF?.value ?? 0, max: 0, unit: '分' },
        empty: doc.snapshots.length === 0,
        emotionBreakdown: [],
        intensityPoints: [],
        valueSeries: { mindfulness, freedom }
    }
}

function snapshotDates(doc: DataDocument): BusinessDate[] {
    return [...new Set(doc.snapshots.map((item) => item.businessDate))].sort((a, b) => compareDate(b, a))
}

export function archiveDailyOf(doc: DataDocument, page: number, pageSize: number): ArchiveDailyResult {
    const dates = snapshotDates(doc)
    const start = (page - 1) * pageSize
    const slice = dates.slice(start, start + pageSize)
    const items: DailyArchiveCard[] = slice.map((date) => {
        const snapshot = doc.snapshots.find((item) => item.businessDate === date)
        const verdict: Verdict | null = doc.verdicts.find((item) => item.businessDate === date) ?? null
        const activities = doc.activities
            .filter((item) => item.revokedAt === null && activityDateOf(item, doc) === date)
            .map((item) => buildActivityView(doc, item))
        const diaries = doc.diaries
            .filter((item) => item.deletedAt === null && item.businessDate === date)
            .map((item) => ({
                id: item.id,
                businessDate: item.businessDate,
                content: item.content,
                emotions: item.tagIds.map((tagId) => emotionMarkOf(doc, tagId)),
                intensity: item.intensity
            }))
        const emotions: DiaryEmotionMark[] = []
        for (const diary of diaries) for (const mark of diary.emotions) if (!emotions.some((item) => item.tagId === mark.tagId)) emotions.push(mark)
        return {
            businessDate: date,
            mindfulnessDelta: snapshot?.mindfulnessDelta ?? 0,
            freedomDelta: snapshot?.freedomDelta ?? 0,
            verdictText: verdict?.text ?? null,
            emotions,
            recordCount: activities.length + diaries.length,
            focusMinutes: focusMinutesOfDay(doc, date, 'focus'),
            activities,
            diaries
        }
    })
    return { items, total: dates.length }
}

function periodKeyOf(period: 'weekly' | 'monthly', date: BusinessDate): string {
    if (period === 'weekly') return startOfWeekMonday(date)
    return startOfMonthDate(date)
}

function periodLabelOf(period: 'weekly' | 'monthly', start: BusinessDate): string {
    if (period === 'weekly') {
        const end = addDays(start, 6)
        return `${formatShortCN(start)} — ${formatShortCN(end)}`
    }
    const { year, month } = parseDateParts(start)
    return `${year}年${month}月`
}

export function archivePeriodOf(doc: DataDocument, period: 'weekly' | 'monthly', page: number, pageSize: number): ArchivePeriodResult {
    const groups = new Map<string, BusinessDate[]>()
    for (const snapshot of doc.snapshots) {
        const key = periodKeyOf(period, snapshot.businessDate)
        const list = groups.get(key)
        if (list) list.push(snapshot.businessDate)
        else groups.set(key, [snapshot.businessDate])
    }
    const keys = [...groups.keys()].sort((a, b) => compareDate(b, a))
    const start = (page - 1) * pageSize
    const pageKeys = keys.slice(start, start + pageSize)
    const items: PeriodCard[] = pageKeys.map((key) => {
        const dates = (groups.get(key) ?? []).sort(compareDate)
        const startDate = dates[0] ?? key
        const endDate = dates[dates.length - 1] ?? key
        const series = dates.map((date) => {
            const snapshot = doc.snapshots.find((item) => item.businessDate === date)
            return { date, mindfulness: snapshot?.mindfulnessTotal ?? 0, freedom: snapshot?.freedomTotal ?? 0 }
        })
        const totalM = dates.reduce((sum, date) => sum + (doc.snapshots.find((item) => item.businessDate === date)?.mindfulnessDelta ?? 0), 0)
        const totalF = dates.reduce((sum, date) => sum + (doc.snapshots.find((item) => item.businessDate === date)?.freedomDelta ?? 0), 0)
        const focusTotal = round1(dates.reduce((sum, date) => sum + focusMinutesOfDay(doc, date, 'focus'), 0) / 60)
        const diaries = doc.diaries.filter((item) => item.deletedAt === null && dates.includes(item.businessDate))
        const emotions = emotionSlicesOf(doc, diaries).slice(0, 3)
        let bestDay: PeriodCard['bestDay'] = null
        for (const date of dates) {
            const snapshot = doc.snapshots.find((item) => item.businessDate === date)
            const score = (snapshot?.mindfulnessDelta ?? 0) + (snapshot?.freedomDelta ?? 0)
            if (!bestDay || score > bestDay.mindfulness + bestDay.freedom) {
                bestDay = { date, mindfulness: snapshot?.mindfulnessDelta ?? 0, freedom: snapshot?.freedomDelta ?? 0 }
            }
        }
        const summary = [
            `这一段共记录 ${dates.length} 天，专注 ${focusTotal} 小时，写下 ${diaries.length} 篇手记。`,
            `正念累计 +${round1(totalM)}，逍遥累计 +${round1(totalF)}；两条线各有其用。`,
            emotions[0]
                ? `情绪里「${emotions[0].name}」出现最多，记得给自己留一点余地。`
                : '还没有情绪记录，等你想写的时候再写下几行。'
        ]
        return {
            key,
            label: periodLabelOf(period, startDate),
            start: startDate,
            end: endDate,
            series,
            summary,
            bestDay,
            focusMinutes: round1(focusTotal * 60),
            topEmotions: emotions.map((item) => ({ name: item.name, emoji: item.emoji, count: item.count }))
        }
    })
    return { items, pendingDates: [] }
}

export function historyOf(
    doc: DataDocument,
    sortBy: 'date' | 'mindfulness' | 'freedom' | 'focus' | 'records',
    sortDir: 'asc' | 'desc',
    page: number,
    pageSize: number
): HistoryResult {
    const rows: HistoryRow[] = doc.snapshots.map((snapshot) => {
        const date = snapshot.businessDate
        const activities = doc.activities.filter((item) => item.revokedAt === null && activityDateOf(item, doc) === date)
        const diaries = doc.diaries.filter((item) => item.deletedAt === null && item.businessDate === date)
        const verdict = doc.verdicts.find((item) => item.businessDate === date)
        return {
            date,
            mindfulness: snapshot.mindfulnessDelta,
            freedom: snapshot.freedomDelta,
            focusMinutes: focusMinutesOfDay(doc, date, 'focus'),
            records: activities.length + diaries.length,
            verdictText: verdict?.text ?? ''
        }
    })
    rows.sort((a, b) => {
        let diff = 0
        if (sortBy === 'date') diff = compareDate(a.date, b.date)
        else if (sortBy === 'mindfulness') diff = a.mindfulness - b.mindfulness
        else if (sortBy === 'freedom') diff = a.freedom - b.freedom
        else if (sortBy === 'focus') diff = a.focusMinutes - b.focusMinutes
        else diff = a.records - b.records
        return sortDir === 'asc' ? diff : -diff
    })
    const start = (page - 1) * pageSize
    return { rows: rows.slice(start, start + pageSize), total: rows.length }
}

export function dailyDetailOf(doc: DataDocument, date: BusinessDate): DailyDetail {
    const activities = doc.activities
        .filter((item) => item.revokedAt === null && activityDateOf(item, doc) === date)
        .map((item) => buildActivityView(doc, item))
    const diaries = doc.diaries.filter((item) => item.deletedAt === null && item.businessDate === date).map((item) => buildDiaryView(doc, item))
    return {
        businessDate: date,
        activities,
        diaries,
        verdict: doc.verdicts.find((item) => item.businessDate === date) ?? null
    }
}

const STATIC_PAGES: SearchItem[] = [
    { id: 'page-home', label: '修身 · 今日', hint: '页面', route: '/', action: null },
    { id: 'page-events', label: '修行事项', hint: '页面', route: '/events', action: null },
    { id: 'page-timer', label: '番茄钟', hint: '页面', route: '/timer', action: null },
    { id: 'page-mind', label: '修心 · 情绪月历', hint: '页面', route: '/mind', action: null },
    { id: 'page-records', label: '卷宗 · 总览', hint: '页面', route: '/records', action: null },
    { id: 'page-trends', label: '卷宗 · 趋势分析', hint: '页面', route: '/records/trends', action: null },
    { id: 'page-archives', label: '卷宗 · 修行归档', hint: '页面', route: '/records/archives', action: null },
    { id: 'page-spirit', label: '灵台', hint: '页面', route: '/self', action: null },
    { id: 'page-achievements', label: '成就称号', hint: '页面', route: '/self/achievements', action: null },
    { id: 'page-settings', label: '修行设置', hint: '页面', route: '/settings', action: null }
]

const STATIC_ACTIONS: SearchItem[] = [
    { id: 'action-new-event', label: '立一桩修行', hint: '操作', route: '/events/new', action: 'new-event' },
    { id: 'action-new-diary', label: '写手记', hint: '操作', route: '/mind/diary/new', action: 'new-diary' },
    { id: 'action-start-timer', label: '开始计时', hint: '操作', route: '/timer', action: 'start-timer' },
    { id: 'action-export', label: '导出卷宗', hint: '操作', route: '/records/archives', action: 'export' },
    { id: 'action-settings', label: '打开设置', hint: '操作', route: '/settings', action: 'settings' }
]

export function searchOf(doc: DataDocument, keyword: string): SearchResult {
    const text = keyword.trim()
    if (text.length === 0) {
        return { pages: STATIC_PAGES.slice(0, 6), events: [], diaries: [], actions: STATIC_ACTIONS }
    }
    const pages = STATIC_PAGES.filter((item) => item.label.includes(text))
    const events: SearchItem[] = doc.events
        .filter((item: Event) => item.deletedAt === null && item.title.includes(text))
        .slice(0, 8)
        .map((item) => ({ id: item.id, label: item.title, hint: '事项', route: `/events/${item.id}/edit`, action: null }))
    const diaries: SearchItem[] = doc.diaries
        .filter((item) => item.deletedAt === null && item.content.includes(text))
        .slice(0, 8)
        .map((item) => ({
            id: item.id,
            label: item.content.slice(0, 24),
            hint: `手记 · ${item.businessDate}`,
            route: `/mind/diary/${item.id}`,
            action: null
        }))
    const actions = STATIC_ACTIONS.filter((item) => item.label.includes(text))
    return { pages, events, diaries, actions }
}

export function tagById(tags: Tag[], id: string | null): Tag | null {
    if (!id) return null
    return tags.find((item) => item.id === id) ?? null
}

export function snapshotOf(doc: DataDocument, date: BusinessDate): Snapshot | null {
    return doc.snapshots.find((item) => item.businessDate === date) ?? null
}

export function ledgerOf(doc: DataDocument, date: BusinessDate): LedgerEntry[] {
    return doc.ledgerEntries.filter((item) => item.businessDate === date)
}