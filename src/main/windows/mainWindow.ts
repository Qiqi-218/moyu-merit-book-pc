import { BrowserWindow } from 'electron'
import { join } from 'path'
import type { WindowState } from '@shared/types/dto'
import { EVENT_CHANNELS } from '@shared/ipc'

export interface MainWindowOptions {
    theme: 'paper' | 'night'
    fontSize: 'normal' | 'large'
    devUrl?: string | undefined
    onStateChange(state: WindowState): void
}

function isAppUrl(url: string, devUrl?: string): boolean {
    if (url.startsWith('file://')) return true
    if (devUrl && url.startsWith(devUrl)) return true
    return url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')
}

export function createMainWindow(options: MainWindowOptions): BrowserWindow {
    const window = new BrowserWindow({
        width: 1360,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        frame: false,
        backgroundColor: options.theme === 'night' ? '#1E2420' : '#F4F0E6',
        title: '摸鱼功德簿',
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            webSecurity: true,
            webviewTag: false,
            additionalArguments: [`--moyu-theme=${options.theme}`, `--moyu-font-size=${options.fontSize}`]
        }
    })

    window.setMenuBarVisibility(false)
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event, url) => {
        if (!isAppUrl(url, options.devUrl)) event.preventDefault()
    })

    const emitState = (): void => {
        if (window.isDestroyed()) return
        options.onStateChange({
            maximized: window.isMaximized(),
            fullscreen: window.isFullScreen(),
            focused: window.isFocused()
        })
    }
    window.on('maximize', emitState)
    window.on('unmaximize', emitState)
    window.on('enter-full-screen', emitState)
    window.on('leave-full-screen', emitState)
    window.on('focus', emitState)
    window.on('blur', emitState)

    window.once('ready-to-show', () => {
        window.show()
    })

    if (options.devUrl) {
        void window.loadURL(options.devUrl)
    } else {
        void window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    window.webContents.on('did-finish-load', () => {
        window.webContents.send(EVENT_CHANNELS.windowState, {
            maximized: window.isMaximized(),
            fullscreen: window.isFullScreen(),
            focused: window.isFocused()
        })
    })

    return window
}