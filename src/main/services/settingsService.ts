import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { SettingsPatch } from '@shared/types/dto'
import type { Settings } from '@shared/types/models'
import { validateDayBoundary } from '@shared/validators'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

export function getSettings(ctx: ServiceContext): Result<Settings> {
    return ok(ctx.doc.settings)
}

export async function patchSettings(ctx: ServiceContext, patch: SettingsPatch): Promise<Result<Settings>> {
    if (patch.dayBoundaryHour !== undefined) {
        const check = validateDayBoundary(patch.dayBoundaryHour)
        if (!check.valid) return fail('E_VALIDATION', check.message)
    }
    try {
        const next = await ctx.commit((draft) => {
            const settings = draft.settings
            if (patch.dayBoundaryHour !== undefined) settings.dayBoundaryHour = patch.dayBoundaryHour
            if (patch.theme !== undefined) settings.theme = patch.theme
            if (patch.fontSize !== undefined) settings.fontSize = patch.fontSize
            if (patch.motion !== undefined) settings.motion = patch.motion
            if (patch.sound !== undefined) settings.sound = patch.sound
            if (patch.closeToTray !== undefined) settings.closeToTray = patch.closeToTray
            if (patch.launchAtLogin !== undefined) settings.launchAtLogin = patch.launchAtLogin
            if (patch.miniTimerOnTop !== undefined) settings.miniTimerOnTop = patch.miniTimerOnTop
            if (patch.globalShortcuts !== undefined) settings.globalShortcuts = patch.globalShortcuts
            if (patch.autoSettleOnStart !== undefined) settings.autoSettleOnStart = patch.autoSettleOnStart
            if (patch.aiEnabled !== undefined) settings.aiEnabled = patch.aiEnabled
            if (patch.guidanceSeen !== undefined) settings.guidanceSeen = patch.guidanceSeen
            if (patch.notifications) {
                if (patch.notifications.timer !== undefined) settings.notifications.timer = patch.notifications.timer
                if (patch.notifications.settlement !== undefined) settings.notifications.settlement = patch.notifications.settlement
                if (patch.notifications.title !== undefined) settings.notifications.title = patch.notifications.title
                if (patch.notifications.achievement !== undefined) settings.notifications.achievement = patch.notifications.achievement
            }
            return settings
        })
        ctx.broadcast('settings')
        return ok(next)
    } catch (error) {
        return errorToFail('settings', error)
    }
}