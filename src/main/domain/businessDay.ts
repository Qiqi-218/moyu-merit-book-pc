import type { BusinessDate, ISODate } from '@shared/types/models'
import { addDays, parseDateParts } from '@shared/dateUtils'

export interface BusinessWindow {
    start: ISODate
    end: ISODate
}

function readParts(instant: number, timeZone: string): Record<string, string> {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })
    const parts = formatter.formatToParts(new Date(instant))
    const map: Record<string, string> = {}
    for (const part of parts) {
        if (part.type !== 'literal') map[part.type] = part.value
    }
    return map
}

export function toPlainLocal(instant: number | string, timeZone: string): number {
    const ms = typeof instant === 'string' ? Date.parse(instant) : instant
    const safe = Math.floor(ms / 1000) * 1000
    const parts = readParts(safe, timeZone)
    const year = Number(parts.year ?? '1970')
    const month = Number(parts.month ?? '01')
    const day = Number(parts.day ?? '01')
    const hourRaw = Number(parts.hour ?? '0')
    const hour = hourRaw === 24 ? 0 : hourRaw
    const minute = Number(parts.minute ?? '0')
    const second = Number(parts.second ?? '0')
    return Date.UTC(year, month - 1, day, hour, minute, second)
}

export function offsetOf(instant: number | string, timeZone: string): number {
    const ms = typeof instant === 'string' ? Date.parse(instant) : instant
    return toPlainLocal(ms, timeZone) - Math.floor(ms / 1000) * 1000
}

export function businessDateOf(instant: number | string, boundaryHour: number, timeZone: string): BusinessDate {
    const plain = toPlainLocal(instant, timeZone)
    const shifted = plain - boundaryHour * 3600000
    const date = new Date(shifted)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function startUtcOf(date: BusinessDate, boundaryHour: number, timeZone: string): number {
    const { year, month, day } = parseDateParts(date)
    const naive = Date.UTC(year, month - 1, day, boundaryHour, 0, 0)
    const firstOffset = offsetOf(naive, timeZone)
    const candidate = naive - firstOffset
    const secondOffset = offsetOf(candidate, timeZone)
    return naive - secondOffset
}

export function windowOf(date: BusinessDate, boundaryHour: number, timeZone: string): BusinessWindow {
    const start = startUtcOf(date, boundaryHour, timeZone)
    const next = addDays(date, 1)
    const end = startUtcOf(next, boundaryHour, timeZone)
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
}

export function businessDateNow(now: number, boundaryHour: number, timeZone: string): BusinessDate {
    return businessDateOf(now, boundaryHour, timeZone)
}

export function localHourOf(instant: string, timeZone: string): number {
    const parts = readParts(Math.floor(Date.parse(instant) / 1000) * 1000, timeZone)
    const raw = Number(parts.hour ?? '0')
    return raw === 24 ? 0 : raw
}

export function localDateOf(instant: string, timeZone: string): BusinessDate {
    const parts = readParts(Math.floor(Date.parse(instant) / 1000) * 1000, timeZone)
    const year = parts.year ?? '1970'
    const month = parts.month ?? '01'
    const day = parts.day ?? '01'
    return `${year}-${month}-${day}`
}