import type { ISODate, TimerMode } from './types/models'

export interface TimerClockInput {
    mode: TimerMode
    status: 'running' | 'paused'
    plannedSeconds: number | null
    accumulatedSeconds: number
    resumedAt: ISODate | null
}

export function elapsedSecondsOf(input: TimerClockInput, nowMs: number): number {
    const resumedMs = input.status === 'running' && input.resumedAt !== null ? Date.parse(input.resumedAt) : Number.NaN
    const runningSeconds = Number.isFinite(resumedMs) ? Math.max(0, (nowMs - resumedMs) / 1000) : 0
    return Math.max(0, Math.floor(input.accumulatedSeconds + runningSeconds))
}

export function displaySecondsOf(input: TimerClockInput, nowMs: number): number {
    const elapsed = elapsedSecondsOf(input, nowMs)
    if (input.mode === 'countdown') return Math.max(0, (input.plannedSeconds ?? 0) - elapsed)
    return elapsed
}