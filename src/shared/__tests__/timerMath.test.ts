import { describe, expect, it } from 'vitest'
import { displaySecondsOf, elapsedSecondsOf } from '../timerMath'
import type { TimerClockInput } from '../timerMath'

function paused(accumulatedSeconds: number, plannedSeconds = 1500): TimerClockInput {
    return { mode: 'countdown', status: 'paused', plannedSeconds, accumulatedSeconds, resumedAt: null }
}

function running(accumulatedSeconds: number, resumedAtMs: number, plannedSeconds = 1500): TimerClockInput {
    return { mode: 'countdown', status: 'running', plannedSeconds, accumulatedSeconds, resumedAt: new Date(resumedAtMs).toISOString() }
}

describe('timerMath', () => {
    it('暂停时剩余时间保持为暂停那一刻的数值', () => {
        expect(displaySecondsOf(paused(300), Date.now())).toBe(1200)
    })

    it('继续后从暂停时的剩余时间接续，不会重置为完整时长', () => {
        const resumedAtMs = Date.UTC(2026, 0, 1, 0, 0, 0)
        const state = running(300, resumedAtMs)
        expect(displaySecondsOf(state, resumedAtMs)).toBe(1200)
        expect(displaySecondsOf(state, resumedAtMs + 10_000)).toBe(1190)
    })

    it('暂停 — 等待 — 继续 的完整链路保持时间连续', () => {
        const pausedState = paused(305)
        expect(displaySecondsOf(pausedState, 0)).toBe(1195)
        const resumedAtMs = Date.UTC(2026, 0, 1, 0, 5, 0)
        const resumedState = running(305, resumedAtMs)
        expect(displaySecondsOf(resumedState, resumedAtMs)).toBe(1195)
        expect(displaySecondsOf(resumedState, resumedAtMs + 5_000)).toBe(1190)
    })

    it('正计时按累计秒数继续累计', () => {
        const resumedAtMs = Date.UTC(2026, 0, 1, 0, 0, 0)
        const state: TimerClockInput = {
            mode: 'countup',
            status: 'running',
            plannedSeconds: null,
            accumulatedSeconds: 120,
            resumedAt: new Date(resumedAtMs).toISOString()
        }
        expect(displaySecondsOf(state, resumedAtMs)).toBe(120)
        expect(displaySecondsOf(state, resumedAtMs + 30_000)).toBe(150)
    })

    it('后台节流后按墙钟基准校正，而不是按本地 tick 次数', () => {
        const resumedAtMs = Date.UTC(2026, 0, 1, 0, 0, 0)
        const state = running(0, resumedAtMs)
        expect(displaySecondsOf(state, resumedAtMs + 300_000)).toBe(1200)
    })

    it('时间戳非法时回退为累计值且不产生 NaN', () => {
        const state: TimerClockInput = {
            mode: 'countdown',
            status: 'running',
            plannedSeconds: 1500,
            accumulatedSeconds: 100,
            resumedAt: 'not-a-date'
        }
        expect(Number.isNaN(elapsedSecondsOf(state, Date.now()))).toBe(false)
        expect(displaySecondsOf(state, Date.now())).toBe(1400)
    })

    it('倒计时不会显示负剩余时间', () => {
        const resumedAtMs = Date.UTC(2026, 0, 1, 0, 0, 0)
        expect(displaySecondsOf(running(1500, resumedAtMs), resumedAtMs + 10_000)).toBe(0)
    })
})