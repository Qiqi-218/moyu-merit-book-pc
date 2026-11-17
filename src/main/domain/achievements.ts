import type { AchievementStats, AchievementUnlock, TitleState } from '@shared/types/dto'
import type { Activity, BusinessDate, Diary, Event, Instance, Snapshot, UserAchievement } from '@shared/types/models'
import type { AchievementDef } from '@shared/types/rules'
import { addDays, compareDate, parseDateParts } from '@shared/dateUtils'
import { businessDateOf, localHourOf } from './businessDay'

export interface AchievementContext {
    activities: Activity[]
    diaries: Diary[]
    instances: Instance[]
    events: Event[]
    snapshots: Snapshot[]
    titles: TitleState
    exportCount: number
    timezone: string
    boundaryHour: number
    today: BusinessDate
}

function activityDate(activity: Activity, boundaryHour: number, timezone: string): BusinessDate {
    return businessDateOf(activity.occurredAt, boundaryHour, timezone)
}

function streakOfDates(dates: Set<BusinessDate>, today: BusinessDate, stepDays = 1): number {
    let cursor = today
    if (!dates.has(cursor)) cursor = addDays(cursor, -1)
    let count = 0
    while (dates.has(cursor)) {
        count += 1
        cursor = addDays(cursor, -stepDays)
    }
    return count
}

function monthIndex(date: BusinessDate): number {
    const { year, month } = parseDateParts(date)
    return year * 12 + month
}

function habitStreak(instances: Instance[], events: Event[]): number {
    let max = 0
    for (const event of events) {
        if (event.kind !== 'habit' || event.deletedAt !== null) continue
        const dates = [...new Set(instances.filter((item) => item.eventId === event.id && item.status === 'completed').map((item) => item.businessDate))].sort(compareDate)
        if (dates.length === 0) continue
        let current = 1
        let best = 1
        for (let i = 1; i < dates.length; i += 1) {
            const prev = dates[i - 1]
            const next = dates[i]
            if (!prev || !next) continue
            let consecutive = false
            if (event.frequency === 'weekly') {
                const diff = (Date.parse(`${next}T00:00:00Z`) - Date.parse(`${prev}T00:00:00Z`)) / 86400000
                consecutive = diff === 7
            } else if (event.frequency === 'monthly') {
                consecutive = monthIndex(next) - monthIndex(prev) === 1
            } else {
                consecutive = next === addDays(prev, 1)
            }
            if (consecutive) {
                current += 1
                best = Math.max(best, current)
            } else {
                current = 1
            }
        }
        max = Math.max(max, best)
    }
    return max
}

export function computeStats(context: AchievementContext): AchievementStats {
    const { activities, diaries, instances, events, snapshots, titles, exportCount, timezone, boundaryHour, today } = context
    const alive = activities.filter((item) => item.revokedAt === null)
    const aliveDiaries = diaries.filter((item) => item.deletedAt === null)

    const focusSeconds = alive
        .filter((item) => item.kind === 'timer' && item.purpose === 'focus')
        .reduce((sum, item) => sum + Math.max(0, item.durationSeconds), 0)

    const todoEventIds = new Set(events.filter((item) => item.kind === 'todo' && item.deletedAt === null).map((item) => item.id))
    const todoCompleted = new Set(
        instances
            .filter((item) => todoEventIds.has(item.eventId) && item.status === 'completed')
            .map((item) => item.id)
    )

    const recordDates = new Set<BusinessDate>()
    for (const item of alive) recordDates.add(activityDate(item, boundaryHour, timezone))
    for (const item of aliveDiaries) recordDates.add(item.businessDate)

    const diaryDates = new Set(aliveDiaries.map((item) => item.businessDate))

    let early = false
    let late = false
    for (const item of alive) {
        const hour = localHourOf(item.occurredAt, timezone)
        if (hour < 6) early = true
        if (hour > 22) late = true
    }

    let freedomTotal = 0
    for (const snapshot of snapshots) {
        if (snapshot.freedomTotal > freedomTotal) freedomTotal = snapshot.freedomTotal
    }

    return {
        firstActivity: alive.length > 0 || aliveDiaries.length > 0,
        focusSeconds,
        diaryCount: aliveDiaries.length,
        todoCompletedCount: todoCompleted.size,
        habitStreak: habitStreak(instances, events),
        recordStreak: streakOfDates(recordDates, today),
        diaryStreak: streakOfDates(diaryDates, today),
        titleCount: Math.max(0, titles.mindfulness.level) + Math.max(0, titles.freedom.level),
        freedomTotal,
        exportCount,
        earlyLate: { early, late }
    }
}

export function statValueOf(def: AchievementDef, stats: AchievementStats): number {
    switch (def.conditionType) {
        case 'firstActivity':
            return stats.firstActivity ? 1 : 0
        case 'focusSeconds':
            return stats.focusSeconds
        case 'diaryDayStreak':
            return stats.diaryStreak
        case 'diaryCount':
            return stats.diaryCount
        case 'todoCompletedCount':
            return stats.todoCompletedCount
        case 'habitDayStreak':
            return stats.habitStreak
        case 'titleCount':
            return stats.titleCount
        case 'freedomTotal':
            return stats.freedomTotal
        case 'recordDayStreak':
            return stats.recordStreak
        case 'exportCount':
            return stats.exportCount
        case 'earlyLate':
            return (stats.earlyLate.early ? 1 : 0) + (stats.earlyLate.late ? 1 : 0)
        default:
            return 0
    }
}

export function evaluateAchievements(
    defs: AchievementDef[],
    stats: AchievementStats,
    existing: UserAchievement[],
    nowIso: string
): AchievementUnlock[] {
    const unlocked = new Set(existing.map((item) => item.achievementId))
    const result: AchievementUnlock[] = []
    for (const def of defs) {
        if (unlocked.has(def.id)) continue
        if (statValueOf(def, stats) >= def.threshold) {
            result.push({ achievementId: def.id, name: def.name, emoji: def.emoji, unlockedAt: nowIso })
        }
    }
    return result
}

export function progressLabelOf(def: AchievementDef, stats: AchievementStats): string {
    const current = statValueOf(def, stats)
    if (def.conditionType === 'focusSeconds') {
        const hours = Math.round((current / 3600) * 10) / 10
        return `${hours} / ${Math.round(def.threshold / 3600)} 小时`
    }
    if (def.conditionType === 'earlyLate') {
        return `${stats.earlyLate.early ? '已' : '未'}晨 · ${stats.earlyLate.late ? '已' : '未'}夜`
    }
    const unit =
        def.conditionType === 'diaryCount'
            ? '篇'
            : def.conditionType === 'todoCompletedCount'
                ? '个'
                : def.conditionType === 'titleCount'
                    ? '个'
                    : def.conditionType === 'exportCount'
                        ? '次'
                        : def.conditionType === 'firstActivity'
                            ? '笔'
                            : '天'
    return `${Math.min(current, def.threshold)} / ${def.threshold} ${unit}`
}

export function statsFromEmpty(): AchievementStats {
    return {
        firstActivity: false,
        focusSeconds: 0,
        diaryCount: 0,
        todoCompletedCount: 0,
        habitStreak: 0,
        recordStreak: 0,
        diaryStreak: 0,
        titleCount: 0,
        freedomTotal: 0,
        exportCount: 0,
        earlyLate: { early: false, late: false }
    }
}