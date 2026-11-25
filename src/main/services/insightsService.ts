import { ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { BusinessDate } from '@shared/types/models'
import type { HeatmapCell, HeatmapResult, WeeklyReport, WeeklyReportDay, WeeklyReportEmotion, WeeklyReportHour } from '@shared/types/dto'
import { addDays, compareDate } from '@shared/dateUtils'
import { netOfEntries } from '../domain/scoring'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

const WEEK_LENGTH = 7
const MAX_REPORT_ITEMS = 3
const MAX_VERDICT_LENGTH = 48

function localHourOf(iso: string): number {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return 0
    return (date.getUTCHours() + 8) % 24
}

function localDateOf(iso: string): BusinessDate {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
    const shifted = new Date(date.getTime() + 8 * 3600 * 1000)
    return shifted.toISOString().slice(0, 10)
}

function withinWindow(date: BusinessDate, start: BusinessDate, end: BusinessDate): boolean {
    return compareDate(date, start) >= 0 && compareDate(date, end) <= 0
}


export function weeklyReport(ctx: ServiceContext): Result<WeeklyReport> {
    try {
        const endDate = ctx.today()
        const startDate = addDays(endDate, -(WEEK_LENGTH - 1))
        const dates: BusinessDate[] = []
        for (let index = 0; index < WEEK_LENGTH; index += 1) dates.push(addDays(startDate, index))

        const hourMinutes = new Map<number, number>()
        const emotionCount = new Map<string, number>()
        const verdictLines: string[] = []

        const days: WeeklyReportDay[] = dates.map((date) => {
            const net = netOfEntries(ctx.doc.ledgerEntries.filter((entry) => entry.reversedBy === null && entry.businessDate === date))
            const dayActivities = ctx.doc.activities.filter((item) => {
                if (item.revokedAt !== null || item.kind !== 'timer' || item.purpose !== 'focus') return false
                const instance = item.instanceId ? ctx.instance(item.instanceId) : null
                return (instance?.businessDate ?? localDateOf(item.occurredAt)) === date
            })
            let focusMinutes = 0
            for (const activity of dayActivities) {
                focusMinutes += activity.durationSeconds / 60
                const hour = localHourOf(activity.occurredAt)
                hourMinutes.set(hour, (hourMinutes.get(hour) ?? 0) + activity.durationSeconds / 60)
            }
            const instances = ctx.doc.instances.filter((item) => item.businessDate === date)
            const counted = instances.filter((item) => {
                const event = ctx.event(item.eventId)
                return event !== null && event.kind !== 'principle' && item.status !== 'shelved' && item.status !== 'skipped'
            })
            return {
                date,
                mindfulness: Math.round(net.mindfulness * 10) / 10,
                freedom: Math.round(net.freedom * 10) / 10,
                focusMinutes: Math.round(focusMinutes),
                completed: counted.filter((item) => item.status === 'completed').length,
                total: counted.length
            }
        })

        for (const diary of ctx.doc.diaries) {
            if (!withinWindow(diary.businessDate, startDate, endDate)) continue
            for (const tagId of diary.tagIds) {
                const tag = ctx.doc.tags.find((item) => item.id === tagId)
                if (!tag || tag.kind !== 'emotion') continue
                emotionCount.set(tagId, (emotionCount.get(tagId) ?? 0) + 1)
            }
        }

        for (const verdict of ctx.doc.verdicts) {
            if (verdict.status !== 'generated') continue
            if (!withinWindow(verdict.businessDate, startDate, endDate)) continue
            const text = verdict.polishedText || verdict.text
            const trimmed = text.length > MAX_VERDICT_LENGTH ? `${text.slice(0, MAX_VERDICT_LENGTH)}…` : text
            if (trimmed && !verdictLines.includes(trimmed)) verdictLines.push(trimmed)
        }

        const emotions: WeeklyReportEmotion[] = [...emotionCount.entries()]
            .map(([tagId, count]) => {
                const tag = ctx.doc.tags.find((item) => item.id === tagId)
                return { emoji: tag?.emoji ?? '·', name: tag?.name ?? '未命名', count }
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, MAX_REPORT_ITEMS)

        const bestHours: WeeklyReportHour[] = [...hourMinutes.entries()]
            .map(([hour, minutes]) => ({ hour, minutes: Math.round(minutes) }))
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, MAX_REPORT_ITEMS)

        const completed = days.reduce((sum, item) => sum + item.completed, 0)
        const total = days.reduce((sum, item) => sum + item.total, 0)

        return ok({
            startDate,
            endDate,
            days,
            mindfulnessTotal: Math.round(days.reduce((sum, item) => sum + item.mindfulness, 0) * 10) / 10,
            freedomTotal: Math.round(days.reduce((sum, item) => sum + item.freedom, 0) * 10) / 10,
            focusMinutes: days.reduce((sum, item) => sum + item.focusMinutes, 0),
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            activeDays: days.filter((item) => item.mindfulness > 0 || item.freedom > 0 || item.focusMinutes > 0).length,
            bestHours,
            emotions,
            verdictLines: verdictLines.slice(0, MAX_REPORT_ITEMS)
        })
    } catch (error) {
        return errorToFail('insights', error)
    }
}

export function yearHeatmap(ctx: ServiceContext, year: number): Result<HeatmapResult> {
    try {
        const today = ctx.today()
        const start = `${year}-01-01`
        const end = compareDate(`${year}-12-31`, today) <= 0 ? `${year}-12-31` : today
        const cells: HeatmapCell[] = []
        if (compareDate(start, end) <= 0) {
            let cursor = start
            while (compareDate(cursor, end) <= 0) {
                const net = ctx.dayNet(cursor)
                const total = Math.round((net.mindfulness + net.freedom) * 10) / 10
                cells.push({ date: cursor, mindfulness: net.mindfulness, freedom: net.freedom, total })
                cursor = addDays(cursor, 1)
            }
        }

        let longestStreak = 0
        let running = 0
        let currentStreak = 0
        for (const cell of cells) {
            if (cell.total > 0) {
                running += 1
                longestStreak = Math.max(longestStreak, running)
            } else {
                running = 0
            }
        }
        for (let index = cells.length - 1; index >= 0; index -= 1) {
            const cell = cells[index]
            if (!cell || cell.total <= 0) break
            currentStreak += 1
        }

        return ok({
            year,
            cells,
            max: cells.reduce((max, item) => Math.max(max, item.total), 0),
            activeDays: cells.filter((item) => item.total > 0).length,
            totalDays: cells.length,
            currentStreak,
            longestStreak,
            totalMindfulness: Math.round(cells.reduce((sum, item) => sum + item.mindfulness, 0) * 10) / 10,
            totalFreedom: Math.round(cells.reduce((sum, item) => sum + item.freedom, 0) * 10) / 10
        })
    } catch (error) {
        return errorToFail('insights', error)
    }
}