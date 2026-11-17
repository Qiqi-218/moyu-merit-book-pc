import { defineStore } from 'pinia'
import type {
    ArchiveDailyResult,
    ArchivePeriodResult,
    HistoryQuery,
    HistoryResult,
    RecordsOverview,
    SettlementResult,
    TrendQuery,
    TrendResult
} from '@shared/types/dto'
import { call } from '@/api'
import { useUiStore } from './ui'

export const useRecordsStore = defineStore('records', {
    state: () => ({
        overview: null as RecordsOverview | null,
        trend: null as TrendResult | null,
        archiveDaily: null as ArchiveDailyResult | null,
        archivePeriod: null as ArchivePeriodResult | null,
        history: null as HistoryResult | null,
        loading: false,
        settling: false
    }),
    actions: {
        async loadOverview(businessDate: string): Promise<void> {
            const result = await call(window.moyu.records.overview({ businessDate }), true)
            if (result) this.overview = result
        },
        async loadTrend(query: TrendQuery): Promise<void> {
            const result = await call(window.moyu.records.trend(query), true)
            if (result) this.trend = result
        },
        async loadArchiveDaily(page = 1, pageSize = 20): Promise<void> {
            const result = await call(window.moyu.records.archiveDaily({ page, pageSize }), true)
            if (result) this.archiveDaily = result
        },
        async loadArchivePeriod(period: 'weekly' | 'monthly', page = 1, pageSize = 12): Promise<void> {
            const result = await call(window.moyu.records.archivePeriod({ period, page, pageSize }), true)
            if (result) this.archivePeriod = result
        },
        async loadHistory(query: HistoryQuery): Promise<void> {
            const result = await call(window.moyu.records.history(query), true)
            if (result) this.history = result
        },
        async settle(businessDate?: string): Promise<SettlementResult | null> {
            this.settling = true
            try {
                const payload = businessDate ? { businessDate } : {}
                const wait = new Promise<void>((resolve) => window.setTimeout(resolve, 600))
                const [result] = await Promise.all([call(window.moyu.settlement.run(payload)), wait])
                if (!result) return null
                const ui = useUiStore()
                ui.pushToast('已结算', `正念 +${result.snapshot.mindfulnessDelta} · 逍遥 +${result.snapshot.freedomDelta}`, 'success')
                for (const promotion of result.promotions) {
                    ui.pushToast('境界提升', promotion.line === 'mindfulness' ? '正念线称号已提升' : '逍遥线称号已提升', 'success')
                }
                if (result.unlocked.length > 0) {
                    ui.pushToast('成就解锁', result.unlocked.map((item) => item.name).join('、'), 'success')
                }
                return result
            } finally {
                this.settling = false
            }
        }
    }
})