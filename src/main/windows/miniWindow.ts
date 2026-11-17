import { BrowserWindow } from 'electron'
import type { WebContents } from 'electron'
import { join } from 'path'

let mini: BrowserWindow | null = null

export function openMiniWindow(alwaysOnTop: boolean): { opened: boolean; focused: boolean } {
    if (mini && !mini.isDestroyed()) {
        mini.setAlwaysOnTop(alwaysOnTop)
        mini.show()
        mini.focus()
        return { opened: false, focused: true }
    }
    mini = new BrowserWindow({
        width: 280,
        height: 120,
        frame: false,
        resizable: false,
        alwaysOnTop,
        skipTaskbar: true,
        show: false,
        backgroundColor: '#F4F0E6',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            webSecurity: true,
            webviewTag: false
        }
    })
    mini.setMenuBarVisibility(false)
    void mini.loadFile(join(__dirname, '../renderer/mini-timer.html'))
    mini.once('ready-to-show', () => {
        mini?.show()
    })
    mini.on('closed', () => {
        mini = null
    })
    return { opened: true, focused: true }
}

export function getMiniWindow(): BrowserWindow | null {
    return mini
}

export function isMiniSender(sender: WebContents): boolean {
    if (!mini || mini.isDestroyed()) return false
    return mini.webContents.id === sender.id
}

export function setMiniAlwaysOnTop(value: boolean): void {
    if (mini && !mini.isDestroyed()) mini.setAlwaysOnTop(value)
}

export function closeMiniWindow(): void {
    if (mini && !mini.isDestroyed()) mini.close()
}