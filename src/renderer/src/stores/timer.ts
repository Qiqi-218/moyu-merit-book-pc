import { defineStore } from 'pinia'
import type { TimerFinishResult, TimerRecordResult, TimerStartInput, TimerState } from '@shared/types/dto'
import { call } from '@/api'

export const useTimerStore = defineStore('timer', {
    state: () => ({
        timer: null as TimerState | null,
        loading: false,
        finishing: false
    }),
    getters: {
        active: (state) => state.timer?.active ?? null,
        running: (state) => state.timer?.active?.status === 'running',
        paused: (state) => state.timer?.active?.status === 'paused'
    },
    actions: {
        hydrate(next: TimerState): void {
            this.timer = next
        },
        async refresh(): Promise<void> {
            const result = await call(window.moyu.timer.state(), true)
            if (result) this.timer = result
        },
        async start(input: TimerStartInput): Promise<boolean> {
            this.loading = true
            try {
                const result = await call(window.moyu.timer.start(input))
                if (!result) return false
                this.timer = result
                return true
            } finally {
                this.loading = false
            }
        },
        async pause(): Promise<boolean> {
            const result = await call(window.moyu.timer.pause())
            if (!result) return false
            this.timer = result
            return true
        },
        async resume(): Promise<boolean> {
            const result = await call(window.moyu.timer.resume())
            if (!result) return false
            this.timer = result
            return true
        },
        async finish(): Promise<TimerFinishResult | null> {
            this.finishing = true
            try {
                return await call(window.moyu.timer.finish())
            } finally {
                this.finishing = false
            }
        },
        async record(sessionId: string, instanceId?: string): Promise<TimerRecordResult | null> {
            const payload: { sessionId: string; instanceId?: string } = { sessionId }
            if (instanceId) payload.instanceId = instanceId
            const result = await call(window.moyu.timer.record(payload))
            if (result) await this.refresh()
            return result
        },
        async discard(): Promise<boolean> {
            const result = await call(window.moyu.timer.discard())
            if (!result) return false
            this.timer = result
            return true
        },
        async openMini(): Promise<boolean> {
            const result = await call(window.moyu.timer.openMini(), true)
            return result?.opened ?? false
        }
    }
})