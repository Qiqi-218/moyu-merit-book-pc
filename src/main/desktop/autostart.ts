import { app } from 'electron'

export function applyLaunchAtLogin(value: boolean): string | null {
    if (!app.isPackaged) return null
    try {
        app.setLoginItemSettings({ openAtLogin: value })
        return null
    } catch {
        return '开机自启设置未能写入系统'
    }
}