import { defineStore } from 'pinia'
import type { Bootstrap, CreateProfileInput, TodayPayload, UpdateProfileInput } from '@shared/types/dto'
import { applyTheme } from '@/utils/theme'
import { useSettingsStore } from './settings'

export const useAppStore = defineStore('app', {
    state: () => ({
        bootstrap: null as Bootstrap | null,
        loading: true,
        bootstrapped: false,
        isUnlocked: false,
        error: '',
        pending: null as Promise<Bootstrap | null> | null
    }),
    getters: {
        hasProfile: (state) => state.bootstrap?.profile !== null && state.bootstrap?.profile !== undefined,
        profile: (state) => state.bootstrap?.profile ?? null,
        settings: (state) => state.bootstrap?.settings ?? null,
        titles: (state) => state.bootstrap?.titles ?? null,
        today: (state) => state.bootstrap?.today ?? null,
        lockRequired: (state) => state.bootstrap?.lockRequired ?? false,
        demoFlag: (state) => state.bootstrap?.demoDataLoaded ?? false,
        version: (state) => state.bootstrap?.version ?? null,
        settlePending: (state) => state.bootstrap?.settlePending ?? false
    },
    actions: {
        async ensureBootstrap(force = false): Promise<Bootstrap | null> {
            if (this.bootstrapped && !force) return this.bootstrap
            if (this.pending) return this.pending
            this.loading = true
            const task = (async (): Promise<Bootstrap | null> => {
                try {
                    const result = await window.moyu.app.bootstrap()
                    if (result.ok) {
                        this.bootstrap = result.data
                        if (!result.data.lockRequired) this.isUnlocked = true
                        this.error = ''
                        applyTheme(result.data.settings)
                        useSettingsStore().hydrate(result.data.settings)
                    } else {
                        this.error = result.error.message
                    }
                } catch {
                    this.error = '本地数据读取未完成'
                } finally {
                    this.loading = false
                    this.bootstrapped = true
                    this.pending = null
                }
                return this.bootstrap
            })()
            this.pending = task
            return task
        },
        async refresh(): Promise<Bootstrap | null> {
            return this.ensureBootstrap(true)
        },
        markUnlocked(): void {
            this.isUnlocked = true
        },
        async createProfile(input: CreateProfileInput): Promise<boolean> {
            const result = await window.moyu.profile.create(input)
            if (!result.ok) return false
            if (!result.data) {
                const bootstrapped = await this.ensureBootstrap(true)
                return bootstrapped?.profile !== null && bootstrapped?.profile !== undefined
            }
            this.bootstrap = result.data
            this.isUnlocked = true
            this.bootstrapped = true
            applyTheme(result.data.settings)
            useSettingsStore().hydrate(result.data.settings)
            return true
        },
        async updateProfile(patch: UpdateProfileInput): Promise<boolean> {
            const result = await window.moyu.profile.update(patch)
            if (!result.ok) return false
            if (this.bootstrap) this.bootstrap.profile = result.data
            return true
        },
        setToday(payload: TodayPayload): void {
            if (this.bootstrap) this.bootstrap.today = payload
        }
    }
})