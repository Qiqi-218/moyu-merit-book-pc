import { globalShortcut } from 'electron'

export const GLOBAL_TIMER_SHORTCUT = 'CommandOrControl+Shift+T'
export const QUICK_NOTE_SHORTCUT = 'CommandOrControl+Shift+S'

export function applyGlobalShortcut(enabled: boolean, handler: () => void): string | null {
    globalShortcut.unregister(GLOBAL_TIMER_SHORTCUT)
    if (!enabled) return null
    try {
        const registered = globalShortcut.register(GLOBAL_TIMER_SHORTCUT, handler)
        return registered ? null : GLOBAL_TIMER_SHORTCUT
    } catch {
        return GLOBAL_TIMER_SHORTCUT
    }
}

export function unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll()
}
export function applyQuickNoteShortcut(enabled: boolean, handler: () => void): string | null {
    globalShortcut.unregister(QUICK_NOTE_SHORTCUT)
    if (!enabled) return null
    try {
        const registered = globalShortcut.register(QUICK_NOTE_SHORTCUT, handler)
        return registered ? null : QUICK_NOTE_SHORTCUT
    } catch {
        return QUICK_NOTE_SHORTCUT
    }
}