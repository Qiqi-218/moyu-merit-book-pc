export function isoOf(ms: number): string {
    return new Date(ms).toISOString()
}

export function nowIso(now: number = Date.now()): string {
    return new Date(now).toISOString()
}

export function parseIso(value: string): number {
    const time = Date.parse(value)
    return Number.isNaN(time) ? 0 : time
}

export function toNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function round1(value: number): number {
    return Math.round(value * 10 + 1e-9) / 10
}