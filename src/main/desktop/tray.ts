import { Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

export interface TrayDeps {
    getWindow(): BrowserWindow | null
    onOpen(): void
    onStartFocus(): void
    onShowVerdict(): void
    onQuit(): void
    getLabel(): string
}

export class TrayController {
    private tray: Tray | null = null

    constructor(private readonly deps: TrayDeps) { }

    create(resourceDir: string): void {
        if (this.tray) return
        const iconPath = join(resourceDir, 'icon', 'tray-32.png')
        const image = existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
        this.tray = new Tray(image)
        this.tray.setToolTip('摸鱼功德簿')
        this.refresh()
        this.tray.on('click', () => this.deps.onOpen())
    }

    refresh(): void {
        if (!this.tray) return
        const label = this.deps.getLabel()
        this.tray.setToolTip(`摸鱼功德簿 · ${label}`)
        this.tray.setContextMenu(
            Menu.buildFromTemplate([
                { label: `今日 ${label}`, enabled: false },
                { type: 'separator' },
                { label: '打开', click: () => this.deps.onOpen() },
                { label: '开始专注', click: () => this.deps.onStartFocus() },
                { label: '今日判词', click: () => this.deps.onShowVerdict() },
                { type: 'separator' },
                { label: '退出', click: () => this.deps.onQuit() }
            ])
        )
    }

    destroy(): void {
        if (this.tray) {
            this.tray.destroy()
            this.tray = null
        }
    }
}