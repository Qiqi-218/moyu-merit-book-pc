import { defineStore } from 'pinia'
import type { ActivityResult, DayTotals, InstanceView, TodayPayload } from '@shared/types/dto'
import { call } from '@/api'
import { newRequestId } from '@/utils/requestId'
import { useAppStore } from './app'

export const useTodayStore = defineStore('today', {
    state: () => ({
        businessDate: '',
        instances: [] as InstanceView[],
        dayTotals: null as DayTotals | null,
        missing: 0,
        loading: false,
        pendingId: ''
    }),
    getters: {
        totalCount: (state) => state.instances.length,
        completedCount: (state) => state.instances.filter((item) => item.status === 'completed').length,
        pendingCount: (state) => state.instances.filter((item) => item.status === 'pending' || item.status === 'inProgress').length,
        minuteInstances: (state) => state.instances.filter((item) => item.targetUnit === 'minutes')
    },
    actions: {
        hydrate(payload: TodayPayload): void {
            this.businessDate = payload.businessDate
            this.instances = payload.instances
            this.dayTotals = payload.dayTotals
            this.missing = payload.missing
        },
        applyResult(result: ActivityResult): void {
            if (result.instance) {
                const index = this.instances.findIndex((item) => item.id === result.instance?.id)
                if (index >= 0) this.instances.splice(index, 1, result.instance)
                else this.instances.push(result.instance)
            }
            this.dayTotals = result.dayTotals
            this.syncApp()
        },
        syncApp(): void {
            if (!this.dayTotals) return
            useAppStore().setToday({
                businessDate: this.dayTotals.businessDate,
                instances: this.instances,
                dayTotals: this.dayTotals,
                missing: this.missing
            })
        },
        async load(date?: string): Promise<void> {
            const target = date ?? this.businessDate
            if (!target) return
            this.loading = true
            try {
                const list = await call(window.moyu.instances.listByDate(target), true)
                if (list) this.instances = list
            } finally {
                this.loading = false
            }
        },
        async checkIn(instanceId: string, options: { quantity?: number; durationSeconds?: number; note?: string } = {}): Promise<boolean> {
            this.pendingId = instanceId
            try {
                const payload: { instanceId: string; requestId: string; quantity?: number; durationSeconds?: number; note?: string } = {
                    instanceId,
                    requestId: newRequestId()
                }
                if (options.quantity !== undefined) payload.quantity = options.quantity
                if (options.durationSeconds !== undefined) payload.durationSeconds = options.durationSeconds
                if (options.note !== undefined) payload.note = options.note
                const result = await call(window.moyu.activities.checkIn(payload))
                if (!result) return false
                this.applyResult(result)
                return true
            } finally {
                this.pendingId = ''
            }
        },
        async revoke(activityId: string): Promise<boolean> {
            const result = await call(window.moyu.activities.revoke({ activityId, requestId: newRequestId() }))
            if (!result) return false
            this.applyResult(result)
            return true
        },
        async revokeLast(instanceId: string): Promise<boolean> {
            const list = await call(window.moyu.activities.list({ instanceId, page: 1, pageSize: 20 }), true)
            if (!list || list.length === 0) return false
            const sorted = [...list].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
            const target = sorted[0]
            if (!target) return false
            return this.revoke(target.id)
        },
        async setStatus(instanceId: string, status: 'shelved' | 'skipped' | 'pending'): Promise<boolean> {
            const result = await call(window.moyu.instances.setStatus({ instanceId, status }))
            if (!result) return false
            const index = this.instances.findIndex((item) => item.id === instanceId)
            if (index >= 0) this.instances.splice(index, 1, result)
            return true
        },
        async generate(): Promise<boolean> {
            const result = await call(window.moyu.instances.generateToday())
            if (!result) return false
            this.missing = result.missing
            await this.load()
            return true
        }
    }
})