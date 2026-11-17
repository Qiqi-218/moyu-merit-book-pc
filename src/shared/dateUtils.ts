import type { BusinessDate } from './types/models'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function isDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function parseDateParts(date: BusinessDate): { year: number; month: number; day: number } {
    const [year, month, day] = date.split('-').map((part) => Number(part))
    return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 }
}

export function toDate(date: BusinessDate): Date {
    const { year, month, day } = parseDateParts(date)
    return new Date(Date.UTC(year, month - 1, day))
}

export function fromDate(value: Date): BusinessDate {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function addDays(date: BusinessDate, days: number): BusinessDate {
    const value = toDate(date)
    value.setUTCDate(value.getUTCDate() + days)
    return fromDate(value)
}

export function addMonths(date: BusinessDate, months: number): BusinessDate {
    const { year, month, day } = parseDateParts(date)
    const target = new Date(Date.UTC(year, month - 1 + months, 1))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
    target.setUTCDate(Math.min(day, lastDay))
    return fromDate(target)
}

export function compareDate(a: BusinessDate, b: BusinessDate): number {
    if (a === b) return 0
    return a < b ? -1 : 1
}

export function weekdayIndex(date: BusinessDate): number {
    return toDate(date).getUTCDay()
}

export function weekdayCN(date: BusinessDate): string {
    return WEEKDAYS[weekdayIndex(date)] ?? '周日'
}

export function formatDateCN(date: BusinessDate): string {
    const { year, month, day } = parseDateParts(date)
    return `${year}年${month}月${day}日 ${weekdayCN(date)}`
}

export function formatShortCN(date: BusinessDate): string {
    const { month, day } = parseDateParts(date)
    return `${month}月${day}日`
}

export function monthLabel(year: number, month: number): string {
    return `${year}年${month}月`
}

export function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function monthStart(year: number, month: number): BusinessDate {
    return `${year}-${String(month).padStart(2, '0')}-01`
}

export function daysBetween(start: BusinessDate, end: BusinessDate): number {
    const a = toDate(start).getTime()
    const b = toDate(end).getTime()
    return Math.round((b - a) / 86400000)
}

export function dateRange(start: BusinessDate, end: BusinessDate): BusinessDate[] {
    const total = daysBetween(start, end)
    if (total < 0) return []
    const list: BusinessDate[] = []
    for (let i = 0; i <= total; i += 1) list.push(addDays(start, i))
    return list
}

export function startOfWeekMonday(date: BusinessDate): BusinessDate {
    const index = weekdayIndex(date)
    const diff = index === 0 ? 6 : index - 1
    return addDays(date, -diff)
}

export function startOfMonthDate(date: BusinessDate): BusinessDate {
    const { year, month } = parseDateParts(date)
    return monthStart(year, month)
}

export function weekdayShort(date: BusinessDate): string {
    return weekdayCN(date).replace('周', '')
}

export function hourOfIso(iso: string, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        hour12: false
    })
    const parts = formatter.formatToParts(new Date(iso))
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '0'
    return Number(hour)
}