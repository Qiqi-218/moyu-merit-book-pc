/// <reference lib="dom" />
import { ipcRenderer } from 'electron'
import { IPC, EVENT_CHANNELS } from '@shared/ipc'
import type { MoyuApi } from '@shared/ipc'
import type { Result, AppError } from '@shared/result'
import type {
    AchievementUnlock,
    DataChangedPayload,
    NavigatePayload,
    SettlementResult,
    TimerFinishResult,
    TimerState,
    TitlePromotion,
    WindowState
} from '@shared/types/dto'

function invoke<T>(channel: string, payload?: unknown): Promise<Result<T>> {
    return ipcRenderer.invoke(channel, payload) as Promise<Result<T>>
}

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
    const listener = (_event: unknown, payload: unknown): void => {
        cb(payload as T)
    }
    ipcRenderer.on(channel, listener)
    return () => {
        ipcRenderer.removeListener(channel, listener)
    }
}

export const api: MoyuApi = {
    app: {
        bootstrap: () => invoke(IPC.appBootstrap),
        version: () => invoke(IPC.appVersion),
        openDataDir: () => invoke(IPC.appOpenDataDir),
        openRulesFile: () => invoke(IPC.appOpenRulesFile),
        quit: () => invoke(IPC.appQuit)
    },
    profile: {
        get: () => invoke(IPC.profileGet),
        create: (input) => invoke(IPC.profileCreate, input),
        update: (patch) => invoke(IPC.profileUpdate, patch),
        setPassphrase: (input) => invoke(IPC.profileSetPassphrase, input),
        verifyPassphrase: (input) => invoke(IPC.profileVerifyPassphrase, input),
        clearPassphrase: (input) => invoke(IPC.profileClearPassphrase, input),
        lockState: () => invoke(IPC.profileLockState)
    },
    settings: {
        get: () => invoke(IPC.settingsGet),
        patch: (patch) => invoke(IPC.settingsPatch, patch)
    },
    rules: {
        reset: () => invoke(IPC.rulesReset)
    },
    tags: {
        list: () => invoke(IPC.tagsList),
        create: (input) => invoke(IPC.tagsCreate, input),
        update: (input) => invoke(IPC.tagsUpdate, input),
        remove: (id) => invoke(IPC.tagsRemove, { id })
    },
    events: {
        list: (query) => invoke(IPC.eventsList, query),
        get: (id) => invoke(IPC.eventsGet, { id }),
        create: (input) => invoke(IPC.eventsCreate, input),
        update: (id, input) => invoke(IPC.eventsUpdate, { id, input }),
        changeStatus: (id, status) => invoke(IPC.eventsChangeStatus, { id, status }),
        remove: (id, confirm) => invoke(IPC.eventsRemove, { id, confirm })
    },
    instances: {
        listByDate: (businessDate) => invoke(IPC.instancesListByDate, { businessDate }),
        generateToday: () => invoke(IPC.instancesGenerateToday),
        setStatus: (input) => invoke(IPC.instancesSetStatus, input),
        batchReschedule: (input) => invoke(IPC.instancesBatchReschedule, input),
        batchArchive: (input) => invoke(IPC.instancesBatchArchive, input),
        copyLastWeek: (input) => invoke(IPC.instancesCopyLastWeek, input)
    },
    activities: {
        checkIn: (input) => invoke(IPC.activitiesCheckIn, input),
        list: (query) => invoke(IPC.activitiesList, query),
        revoke: (input) => invoke(IPC.activitiesRevoke, input)
    },
    timer: {
        state: () => invoke(IPC.timerState),
        start: (input) => invoke(IPC.timerStart, input),
        pause: () => invoke(IPC.timerPause),
        resume: () => invoke(IPC.timerResume),
        finish: () => invoke(IPC.timerFinish),
        record: (input) => invoke(IPC.timerRecord, input),
        discard: () => invoke(IPC.timerDiscard),
        openMini: () => invoke(IPC.timerOpenMini)
    },
    diary: {
        listMonth: (input) => invoke(IPC.diaryListMonth, input),
        listDate: (businessDate) => invoke(IPC.diaryListDate, { businessDate }),
        get: (id) => invoke(IPC.diaryGet, { id }),
        create: (input) => invoke(IPC.diaryCreate, input),
        update: (id, input) => invoke(IPC.diaryUpdate, { id, input }),
        remove: (id, confirm) => invoke(IPC.diaryRemove, { id, confirm }),
        getDraft: (scope) => invoke(IPC.diaryGetDraft, scope),
        saveDraft: (scope, payload) => invoke(IPC.diarySaveDraft, { scope, payload }),
        clearDraft: (scope) => invoke(IPC.diaryClearDraft, scope)
    },
    settlement: {
        status: () => invoke(IPC.settlementStatus),
        run: (input) => invoke(IPC.settlementRun, input ?? {}),
        settleMissing: () => invoke(IPC.settlementSettleMissing)
    },
    records: {
        overview: (input) => invoke(IPC.recordsOverview, input),
        trend: (input) => invoke(IPC.recordsTrend, input),
        archiveDaily: (input) => invoke(IPC.recordsArchiveDaily, input),
        archivePeriod: (input) => invoke(IPC.recordsArchivePeriod, input),
        history: (input) => invoke(IPC.recordsHistory, input),
        dailyDetail: (businessDate) => invoke(IPC.recordsDailyDetail, { businessDate }),
        search: (keyword) => invoke(IPC.recordsSearch, { keyword })
    },
    achievements: {
        list: () => invoke(IPC.achievementsList)
    },
    insights: {
        weekly: () => invoke(IPC.insightsWeekly),
        heatmap: (year) => invoke(IPC.insightsHeatmap, { year })
    },
    backup: {
        exportJson: () => invoke(IPC.backupExportJson),
        create: () => invoke(IPC.backupCreate),
        restore: () => invoke(IPC.backupRestore),
        importJson: () => invoke(IPC.backupImportJson),
        clearDemo: (confirm) => invoke(IPC.backupClearDemo, { confirm }),
        clearAll: (input) => invoke(IPC.backupClearAll, input)
    },
    window: {
        state: () => invoke(IPC.windowState),
        minimize: () => invoke(IPC.windowMinimize),
        toggleMaximize: () => invoke(IPC.windowToggleMaximize),
        close: () => invoke(IPC.windowClose),
        setFullscreen: (value) => invoke(IPC.windowSetFullscreen, { value }),
        setMiniAlwaysOnTop: (value) => invoke(IPC.windowSetMiniAlwaysOnTop, { value }),
        closeMini: () => invoke(IPC.windowCloseMini)
    },
    on: {
        dataChanged: (cb) => subscribe<DataChangedPayload>(EVENT_CHANNELS.dataChanged, cb),
        timerState: (cb) => subscribe<TimerState>(EVENT_CHANNELS.timerState, cb),
        timerFinished: (cb) => subscribe<TimerFinishResult>(EVENT_CHANNELS.timerFinished, cb),
        settlementCompleted: (cb) => subscribe<SettlementResult>(EVENT_CHANNELS.settlementCompleted, cb),
        titlePromoted: (cb) => subscribe<TitlePromotion>(EVENT_CHANNELS.titlePromoted, cb),
        achievementUnlocked: (cb) => subscribe<AchievementUnlock[]>(EVENT_CHANNELS.achievementUnlocked, cb),
        navigate: (cb) => subscribe<NavigatePayload>(EVENT_CHANNELS.navigate, cb),
        quickNote: (cb) => subscribe<void>(EVENT_CHANNELS.quickNote, cb),
        reminderReview: (cb) => subscribe<void>(EVENT_CHANNELS.reminderReview, cb),
        windowState: (cb) => subscribe<WindowState>(EVENT_CHANNELS.windowState, cb),
        error: (cb) => subscribe<AppError>(EVENT_CHANNELS.error, cb)
    }
}

export function applyEarlyTheme(): void {
    try {
        const args = process.argv
        const themeArg = args.find((item) => item.startsWith('--moyu-theme='))
        const sizeArg = args.find((item) => item.startsWith('--moyu-font-size='))
        const apply = (): void => {
            const root = document.documentElement
            if (themeArg) root.dataset.theme = themeArg.split('=')[1] === 'night' ? 'night' : 'paper'
            if (sizeArg) root.dataset.fontSize = sizeArg.split('=')[1] === 'large' ? 'large' : 'normal'
        }
        apply()
        document.addEventListener('DOMContentLoaded', apply)
    } catch {
        /* 主题注入失败时保持默认浅色 */
    }
}