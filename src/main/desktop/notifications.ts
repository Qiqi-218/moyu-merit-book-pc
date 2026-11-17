import { Notification } from 'electron'

export function notifyIfEnabled(enabled: boolean, title: string, body: string): void {
    if (!enabled) return
    try {
        if (!Notification.isSupported()) return
        const notification = new Notification({ title, body, silent: false })
        notification.show()
    } catch {
        /* 通知失败静默降级，应用内仍有 Toast */
    }
}