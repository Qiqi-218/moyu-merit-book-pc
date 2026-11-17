import { defineStore } from 'pinia'
import type { Settings } from '@shared/types/models'
import type { SettingsPatch } from '@shared/types/dto'
import { applyTheme } from '@/utils/theme'
import { useUiStore } from './ui'

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        settings: null as Settings | null,
        saving: false
    }),
    getters: {
        theme: (state) => state.settings?.theme ?? 'paper',
        fontSize: (state) => state.settings?.fontSize ?? 'normal',
        dayBoundaryHour: (state) => state.settings?.dayBoundaryHour ?? 4,
        notifications: (state) => state.settings?.notifications ?? { timer: true, settlement: true, title: true, achievement: true },
        closeToTray: (state) => state.settings?.closeToTray ?? true
    },
    actions: {
        hydrate(next: Settings): void {
            this.settings = next
            applyTheme(next)
        },
        async patch(patch: SettingsPatch, silent = false): Promise<boolean> {
            this.saving = true
            try {
                const result = await window.moyu.settings.patch(patch)
                if (!result.ok) {
                    useUiStore().pushToast(result.error.message, result.error.hint)
                    return false
                }
                this.settings = result.data
                applyTheme(result.data)
                if (!silent) useUiStore().pushToast('已保存')
                return true
            } finally {
                this.saving = false
            }
        }
    }
})