import { app, BrowserWindow, dialog, Notification, session } from 'electron'
import { join } from 'path'
import type { BrowserWindow as BrowserWindowType } from 'electron'
import type { DataDocument, Settings } from '@shared/types/models'
import { EVENT_CHANNELS } from '@shared/ipc'
import type { NavigatePayload, WindowState } from '@shared/types/dto'
import { JsonStore } from './store/jsonStore'
import { BackupManager } from './store/backupManager'
import { StoreError } from './store/errors'
import { migrate } from './store/migrator'
import { initLogger, logger } from './utils/logger'
import { nowIso } from './utils/time'
import { ensureRulesFile, loadRules } from './services/rulesService'
import { ServiceContext } from './services/context'
import { settleMissing } from './services/settlementService'
import { activeSession, pauseTimer, recoverTimer, resumeTimer } from './services/timerService'
import { buildDayTotals } from './domain/aggregates'
import { createMainWindow } from './windows/mainWindow'
import { getMiniWindow, isMiniSender, openMiniWindow, setMiniAlwaysOnTop } from './windows/miniWindow'
import { hideApplicationMenu } from './desktop/appMenu'
import { TrayController } from './desktop/tray'
import { notifyIfEnabled } from './desktop/notifications'
import { applyGlobalShortcut, unregisterAllShortcuts } from './desktop/shortcuts'
import { applyLaunchAtLogin } from './desktop/autostart'
import { registerHandlers } from './ipc/registerHandlers'

const BUILD_TIME = process.env.MOYU_BUILD_TIME ?? new Date().toISOString()

let mainWindow: BrowserWindowType | null = null
let tray: TrayController | null = null
let store: JsonStore | null = null
let context: ServiceContext | null = null
let isQuitting = false
let firstCloseNotified = false

function resourceDir(): string {
    return app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')
}

function sendNavigate(route: string): void {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const payload: NavigatePayload = { route }
    mainWindow.webContents.send(EVENT_CHANNELS.navigate, payload)
}

function showWindow(route?: string): void {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    if (route) sendNavigate(route)
}

function windowStateOf(): WindowState {
    return {
        maximized: mainWindow?.isMaximized() ?? false,
        fullscreen: mainWindow?.isFullScreen() ?? false,
        focused: mainWindow?.isFocused() ?? false
    }
}

function emit(channel: string, payload: unknown): void {
    for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.webContents.send(channel, payload)
    }
    if (!context) return
    const settings = context.doc.settings
    if (channel === EVENT_CHANNELS.timerFinished) {
        const data = payload as { focusMinutes: number }
        notifyIfEnabled(settings.notifications.timer, '计时结束', `本次专注 ${data.focusMinutes} 分钟，可回到番茄钟记入。`)
    }
    if (channel === EVENT_CHANNELS.settlementCompleted) {
        notifyIfEnabled(settings.notifications.settlement, '每日结算完成', '今日功德已落卷宗。')
    }
    if (channel === EVENT_CHANNELS.titlePromoted) {
        const data = payload as { line: string }
        notifyIfEnabled(settings.notifications.title, '境界提升', data.line === 'mindfulness' ? '正念线更进一步。' : '逍遥线更进一步。')
    }
    if (channel === EVENT_CHANNELS.achievementUnlocked) {
        const list = payload as Array<{ name: string }>
        if (list.length > 0) notifyIfEnabled(settings.notifications.achievement, '成就解锁', list.map((item) => item.name).join('、'))
    }
    if (channel === EVENT_CHANNELS.dataChanged || channel === EVENT_CHANNELS.settlementCompleted) {
        tray?.refresh()
    }
}

async function init(): Promise<void> {
    app.setAppUserModelId('com.moyu.meritbook')
    hideApplicationMenu()

    const userData = app.getPath('userData')
    initLogger(join(userData, 'logs'))
    const resources = resourceDir()

    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    const devUrl = process.env.ELECTRON_RENDERER_URL
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
        const url = details.url
        if (devUrl && (url.startsWith(devUrl) || url.startsWith('ws://localhost') || url.startsWith('ws://127.0.0.1'))) {
            callback({ cancel: false })
            return
        }
        logger.warn('security', `已拦截网络请求：${url}`)
        callback({ cancel: true })
    })

    store = new JsonStore(userData, app.getVersion(), () => nowIso())
    let doc: DataDocument
    try {
        doc = await store.load()
    } catch (error) {
        logger.error('startup', error instanceof Error ? error.message : String(error))
        try {
            doc = store.document
        } catch {
            dialog.showErrorBox('摸鱼功德簿', '本地数据读取未完成，请打开数据目录检查后重试。')
            app.quit()
            return
        }
    }

    try {
        const migrated = migrate(doc)
        if (migrated !== doc) await store.replace(migrated)
        doc = store.document
    } catch (error) {
        if (error instanceof StoreError) {
            logger.error('startup', error.message)
            dialog.showErrorBox('摸鱼功德簿', `数据迁移未完成：${error.message}`)
            app.quit()
            return
        }
        throw error
    }

    const defaultRulesPath = join(resources, 'rules', 'default-rules.json')
    await ensureRulesFile(store.dataDir, defaultRulesPath)
    const rulesResult = await loadRules(store.dataDir, defaultRulesPath)
    if (JSON.stringify(doc.rules) !== JSON.stringify(rulesResult.rules)) {
        await store.commit((draft) => {
            draft.rules = rulesResult.rules
        })
        doc = store.document
    }

    const backup = new BackupManager(userData)
    context = new ServiceContext(store, backup, app.getVersion(), BUILD_TIME, emit)
    context.unlocked = !context.lockRequired()
    await backup.snapshot(doc, 'startup')

    mainWindow = createMainWindow({
        theme: doc.settings.theme,
        fontSize: doc.settings.fontSize,
        devUrl,
        onStateChange: (state) => emit(EVENT_CHANNELS.windowState, state)
    })
    mainWindow.on('close', (event) => {
        if (isQuitting) return
        const settings = store?.document.settings
        if (settings?.closeToTray) {
            event.preventDefault()
            mainWindow?.hide()
            if (!firstCloseNotified) {
                firstCloseNotified = true
                try {
                    if (Notification.isSupported()) {
                        const notification = new Notification({ title: '摸鱼功德簿', body: '已最小化到托盘，随时可回来继续修行。' })
                        notification.show()
                    }
                } catch {
                    /* 首次关闭提示失败不阻断 */
                }
            }
        }
    })
    mainWindow.on('closed', () => {
        mainWindow = null
    })

    registerHandlers({
        ctx: context,
        windowBridge: {
            getState: windowStateOf,
            minimize: () => mainWindow?.minimize(),
            toggleMaximize: () => {
                if (mainWindow) {
                    if (mainWindow.isMaximized()) mainWindow.unmaximize()
                    else mainWindow.maximize()
                }
                return windowStateOf()
            },
            close: () => mainWindow?.close(),
            setFullscreen: (value) => {
                mainWindow?.setFullScreen(value)
                return windowStateOf()
            },
            setMiniAlwaysOnTop: (value) => setMiniAlwaysOnTop(value)
        },
        openMini: () => openMiniWindow(store?.document.settings.miniTimerOnTop ?? true),
        isMiniSender,
        onSettingsPatched: (settings: Settings) => {
            applyLaunchAtLogin(settings.launchAtLogin)
            applyGlobalShortcut(settings.globalShortcuts, () => {
                void toggleTimerFromGlobal()
            })
            mainWindow?.setBackgroundColor(settings.theme === 'night' ? '#1E2420' : '#F4F0E6')
            setMiniAlwaysOnTop(settings.miniTimerOnTop)
            tray?.refresh()
        }
    })

    await recoverTimer(context)
    if (context.doc.settings.autoSettleOnStart) {
        await settleMissing(context)
    }

    tray = new TrayController({
        getWindow: () => mainWindow,
        onOpen: () => showWindow('/'),
        onStartFocus: () => showWindow('/timer'),
        onShowVerdict: () => showWindow('/records'),
        onQuit: () => {
            isQuitting = true
            app.quit()
        },
        getLabel: () => {
            if (!context) return '正念 0 · 逍遥 0'
            const totals = buildDayTotals(context.doc, context.today())
            return `正念 ${totals.mindfulnessTotal} · 逍遥 ${totals.freedomTotal}`
        }
    })
    tray.create(resources)

    applyLaunchAtLogin(context.doc.settings.launchAtLogin)
    applyGlobalShortcut(context.doc.settings.globalShortcuts, () => {
        void toggleTimerFromGlobal()
    })
}

async function toggleTimerFromGlobal(): Promise<void> {
    if (!context) return
    const active = activeSession(context)
    if (active?.status === 'running') {
        await pauseTimer(context)
        return
    }
    if (active?.status === 'paused') {
        await resumeTimer(context)
        return
    }
    showWindow('/timer')
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
    })

    app.whenReady().then(init).catch((error: unknown) => {
        logger.error('startup', error instanceof Error ? error.message : String(error))
        dialog.showErrorBox('摸鱼功德簿', '应用启动未完成，请重试。')
        app.quit()
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            void init()
        } else {
            showWindow()
        }
    })

    app.on('window-all-closed', () => {
        if (isQuitting || !store?.document.settings.closeToTray) {
            if (process.platform !== 'darwin') app.quit()
        }
    })

    app.on('before-quit', () => {
        isQuitting = true
        unregisterAllShortcuts()
        tray?.destroy()
        const mini = getMiniWindow()
        if (mini && !mini.isDestroyed()) mini.destroy()
    })
}