import { defineStore } from 'pinia'
import type { HeatmapResult, WeeklyReport } from '@shared/types/dto'

export const useInsightsStore = defineStore('insights', {
    state: () => ({
        weekly: null as WeeklyReport | null,
        heatmap: null as HeatmapResult | null
    }),
    actions: {
        async loadWeekly(): Promise<boolean> {
            const result = await window.moyu.insights.weekly()
            if (!result.ok) return false
            this.weekly = result.data
            return true
        },
        async loadHeatmap(year: number): Promise<boolean> {
            const result = await window.moyu.insights.heatmap(year)
            if (!result.ok) return false
            this.heatmap = result.data
            return true
        }
    }
})