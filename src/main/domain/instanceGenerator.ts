import type { BusinessDate, Event, Instance } from '@shared/types/models'
import { addDays, parseDateParts, startOfMonthDate, startOfWeekMonday } from '@shared/dateUtils'
import { businessDateOf, windowOf } from './businessDay'

export interface GenerateContext {
    businessDate: BusinessDate
    boundaryHour: number
    timeZone: string
    nowIso: string
    idFactory: (eventId: string, date: BusinessDate) => string
}

export interface PeriodWindow {
    start: BusinessDate
    endExclusive: BusinessDate
}

export function periodWindow(frequency: Event['frequency'], date: BusinessDate): PeriodWindow {
    if (frequency === 'weekly') {
        const start = startOfWeekMonday(date)
        return { start, endExclusive: addDays(start, 7) }
    }
    if (frequency === 'monthly') {
        const { year, month } = parseDateParts(date)
        const start = startOfMonthDate(date)
        const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
        return { start, endExclusive: `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01` }
    }
    return { start: date, endExclusive: addDays(date, 1) }
}

function instanceWindow(event: Event, date: BusinessDate, ctx: GenerateContext): { start: string; end: string } {
    if (event.kind === 'habit' && (event.frequency === 'weekly' || event.frequency === 'monthly')) {
        const period = periodWindow(event.frequency, date)
        const start = windowOf(date === period.start ? period.start : date, ctx.boundaryHour, ctx.timeZone).start
        const end = windowOf(period.endExclusive, ctx.boundaryHour, ctx.timeZone).start
        return { start, end }
    }
    const window = windowOf(date, ctx.boundaryHour, ctx.timeZone)
    return { start: window.start, end: window.end }
}

export function isCandidate(event: Event): boolean {
    return event.deletedAt === null && event.kind !== 'principle' && event.status === 'active'
}

export function shouldGenerateOn(event: Event, date: BusinessDate, ctx: GenerateContext, existing: Instance[]): boolean {
    if (!isCandidate(event)) return false
    if (event.kind === 'todo') return true
    if (event.frequency === 'once' || event.frequency === 'daily') return true
    const period = periodWindow(event.frequency, date)
    const createdDate = businessDateOf(event.createdAt, ctx.boundaryHour, ctx.timeZone)
    const anchorMatch = date === period.start
    if (anchorMatch) return true
    if (createdDate > period.start && createdDate <= date) {
        const hasEarlier = existing.some(
            (item) => item.eventId === event.id && item.businessDate >= period.start && item.businessDate <= date
        )
        return !hasEarlier
    }
    return false
}

export function generateInstancesForDate(events: Event[], existing: Instance[], ctx: GenerateContext): Instance[] {
    const known = new Set(existing.map((item) => `${item.eventId}|${item.businessDate}`))
    const created: Instance[] = []
    for (const event of events) {
        if (!shouldGenerateOn(event, ctx.businessDate, ctx, existing)) continue
        const key = `${event.id}|${ctx.businessDate}`
        if (known.has(key)) continue
        const window = instanceWindow(event, ctx.businessDate, ctx)
        created.push({
            id: ctx.idFactory(event.id, ctx.businessDate),
            eventId: event.id,
            businessDate: ctx.businessDate,
            windowStart: window.start,
            windowEnd: window.end,
            timezone: 'Asia/Shanghai',
            dayBoundaryHour: ctx.boundaryHour,
            status: 'pending',
            targetValue: event.targetValue,
            targetUnit: event.targetUnit,
            completedAt: null,
            createdAt: ctx.nowIso
        })
        known.add(key)
    }
    return created
}

export function missingInstanceCount(events: Event[], existing: Instance[], ctx: GenerateContext): number {
    return events.filter((event) => {
        if (!isCandidate(event)) return false
        const has = existing.some((item) => item.eventId === event.id && item.businessDate === ctx.businessDate)
        if (has) return false
        return shouldGenerateOn(event, ctx.businessDate, ctx, existing)
    }).length
}