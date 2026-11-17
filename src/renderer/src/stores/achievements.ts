import { defineStore } from 'pinia'
import type { AchievementBoard } from '@shared/types/dto'
import { call } from '@/api'

export const useAchievementsStore = defineStore('achievements', {
    state: () => ({
        board: null as AchievementBoard | null,
        loading: false
    }),
    getters: {
        unlockedIds: (state) => new Set(state.board?.unlocked.map((item) => item.achievementId) ?? []),
        unlockedCount: (state) => state.board?.counts.unlocked ?? 0,
        totalCount: (state) => state.board?.counts.total ?? 12
    },
    actions: {
        async load(): Promise<void> {
            this.loading = true
            try {
                const result = await call(window.moyu.achievements.list(), true)
                if (result) this.board = result
            } finally {
                this.loading = false
            }
        }
    }
})