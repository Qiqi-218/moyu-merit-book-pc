import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent, WebContents } from 'electron'
import { IPC, INVOKE_CHANNELS } from '@shared/ipc'
import type { InvokeChannel } from '@shared/ipc'
import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type {
    ArchivePeriodQuery,
    ArchiveQuery,
    CheckInInput,
    ClearAllInput,
    CreateProfileInput,
    CreateTagInput,
    DiaryInput,
    DraftScope,
    EventInput,
    EventListQuery,
    HistoryQuery,
    RevokeInput,
    SetInstanceStatusInput,
    SetPassphraseInput,
    SettingsPatch,
    TimerRecordInput,
    TimerStartInput,
    TrendQuery,
    UpdateProfileInput,
    UpdateTagInput
} from '@shared/types/dto'
import type { Settings } from '@shared/types/models'
import type { ServiceContext } from '../services/context'
import { errorToFail } from '../services/helpers'
import * as appSvc from '../services/appService'
import * as profileSvc from '../services/profileService'
import * as settingsSvc from '../services/settingsService'
import * as rulesSvc from '../services/rulesService'
import * as tagSvc from '../services/tagService'
import * as eventSvc from '../services/eventService'
import * as instanceSvc from '../services/instanceService'
import * as activitySvc from '../services/activityService'
import * as timerSvc from '../services/timerService'
import * as diarySvc from '../services/diaryService'
import * as settlementSvc from '../services/settlementService'
import * as achievementSvc from '../services/achievementService'
import * as backupSvc from '../services/backupService'
import * as recordsSvc from '../services/recordsService'
import { guardPayload } from './guard'

export interface WindowBridge {
    getState(): { maximized: boolean; fullscreen: boolean; focused: boolean }
    minimize(): void
    toggleMaximize(): { maximized: boolean; fullscreen: boolean; focused: boolean }
    close(): void
    setFullscreen(value: boolean): { maximized: boolean; fullscreen: boolean; focused: boolean }
    setMiniAlwaysOnTop(value: boolean): void
}

export interface HandlerDeps {
    ctx: ServiceContext
    windowBridge: WindowBridge
    openMini(): { opened: boolean; focused: boolean }
    isMiniSender(sender: WebContents): boolean
    onSettingsPatched(settings: Settings): void
}

const LOCK_WHITELIST = new Set<string>([
    IPC.appBootstrap,
    IPC.appVersion,
    IPC.profileLockState,
    IPC.profileVerifyPassphrase,
    IPC.profileCreate,
    IPC.profileGet,
    IPC.backupClearAll,
    IPC.windowState,
    IPC.windowMinimize,
    IPC.windowToggleMaximize,
    IPC.windowClose,
    IPC.windowSetFullscreen
])

function isMiniAllowed(channel: InvokeChannel): boolean {
    return channel === IPC.appBootstrap || channel.startsWith('moyu:timer:') || channel === IPC.windowSetMiniAlwaysOnTop
}

function isTrusted(event: IpcMainInvokeEvent): boolean {
    const frame = event.senderFrame
    if (!frame) return false
    const url = frame.url
    return (
        url.startsWith('file://') ||
        url.startsWith('http://localhost') ||
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('devtools://')
    )
}

type Handler = (payload: unknown) => Promise<Result<unknown>>

function createHandlers(deps: HandlerDeps): Record<InvokeChannel, Handler> {
    const ctx = deps.ctx
    return {
        [IPC.appBootstrap]: async () => ok(appSvc.buildBootstrap(ctx)),
        [IPC.appVersion]: async () => ok(appSvc.versionInfo(ctx)),
        [IPC.appOpenDataDir]: async () => appSvc.openDataDir(ctx),
        [IPC.appOpenRulesFile]: async () => appSvc.openRulesFile(ctx),
        [IPC.appQuit]: async () => {
            appSvc.quitApp()
            return ok(undefined)
        },

        [IPC.profileGet]: async () => profileSvc.getProfile(ctx),
        [IPC.profileCreate]: async (payload) => profileSvc.createProfile(ctx, payload as CreateProfileInput),
        [IPC.profileUpdate]: async (payload) => profileSvc.updateProfile(ctx, payload as UpdateProfileInput),
        [IPC.profileSetPassphrase]: async (payload) => profileSvc.setPassphrase(ctx, payload as SetPassphraseInput),
        [IPC.profileVerifyPassphrase]: async (payload) => profileSvc.verifyPassphrase(ctx, (payload as { passphrase: string }).passphrase),
        [IPC.profileClearPassphrase]: async (payload) => {
            const input = payload as { passphrase: string; confirmText: string }
            return profileSvc.clearPassphrase(ctx, input.passphrase, input.confirmText)
        },
        [IPC.profileLockState]: async () => profileSvc.lockState(ctx),

        [IPC.settingsGet]: async () => settingsSvc.getSettings(ctx),
        [IPC.settingsPatch]: async (payload) => {
            const result = await settingsSvc.patchSettings(ctx, payload as SettingsPatch)
            if (result.ok) deps.onSettingsPatched(result.data)
            return result
        },
        [IPC.rulesReset]: async () => rulesSvc.resetRulesFor(ctx),

        [IPC.tagsList]: async () => tagSvc.listTags(ctx),
        [IPC.tagsCreate]: async (payload) => tagSvc.createTag(ctx, payload as CreateTagInput),
        [IPC.tagsUpdate]: async (payload) => tagSvc.updateTag(ctx, payload as UpdateTagInput),
        [IPC.tagsRemove]: async (payload) => tagSvc.removeTag(ctx, (payload as { id: string }).id),

        [IPC.eventsList]: async (payload) => eventSvc.listEvents(ctx, payload as EventListQuery),
        [IPC.eventsGet]: async (payload) => eventSvc.getEvent(ctx, (payload as { id: string }).id),
        [IPC.eventsCreate]: async (payload) => eventSvc.createEvent(ctx, payload as EventInput),
        [IPC.eventsUpdate]: async (payload) => {
            const input = payload as { id: string; input: EventInput }
            return eventSvc.updateEvent(ctx, input.id, input.input)
        },
        [IPC.eventsChangeStatus]: async (payload) => {
            const input = payload as { id: string; status: 'active' | 'paused' | 'ended' }
            return eventSvc.changeEventStatus(ctx, input.id, input.status)
        },
        [IPC.eventsRemove]: async (payload) => {
            const input = payload as { id: string; confirm: boolean }
            return eventSvc.removeEvent(ctx, input.id, input.confirm)
        },

        [IPC.instancesListByDate]: async (payload) => instanceSvc.listByDate(ctx, (payload as { businessDate: string }).businessDate),
        [IPC.instancesGenerateToday]: async () => instanceSvc.generateToday(ctx),
        [IPC.instancesSetStatus]: async (payload) => {
            const input = payload as SetInstanceStatusInput
            return instanceSvc.setInstanceStatus(ctx, input.instanceId, input.status)
        },

        [IPC.activitiesCheckIn]: async (payload) => activitySvc.checkIn(ctx, payload as CheckInInput),
        [IPC.activitiesList]: async (payload) => {
            const input = payload as { businessDate?: string; instanceId?: string; page: number; pageSize: number }
            let items = ctx.doc.activities.filter((item) => item.revokedAt === null)
            if (input.instanceId) items = items.filter((item) => item.instanceId === input.instanceId)
            if (input.businessDate) items = items.filter((item) => {
                const instance = item.instanceId ? ctx.instance(item.instanceId) : null
                return (instance?.businessDate ?? item.occurredAt.slice(0, 10)) === input.businessDate
            })
            const start = (input.page - 1) * input.pageSize
            return ok(items.slice(start, start + input.pageSize))
        },
        [IPC.activitiesRevoke]: async (payload) => activitySvc.revokeActivity(ctx, payload as RevokeInput),

        [IPC.timerState]: async () => timerSvc.getTimerState(ctx),
        [IPC.timerStart]: async (payload) => timerSvc.startTimer(ctx, payload as TimerStartInput),
        [IPC.timerPause]: async () => timerSvc.pauseTimer(ctx),
        [IPC.timerResume]: async () => timerSvc.resumeTimer(ctx),
        [IPC.timerFinish]: async () => timerSvc.finishTimer(ctx),
        [IPC.timerRecord]: async (payload) => {
            const input = payload as TimerRecordInput
            return timerSvc.recordTimer(ctx, input.sessionId, input.instanceId)
        },
        [IPC.timerDiscard]: async () => timerSvc.discardTimer(ctx),
        [IPC.timerOpenMini]: async () => ok(deps.openMini()),

        [IPC.diaryListMonth]: async (payload) => {
            const input = payload as { year: number; month: number }
            return diarySvc.listMonth(ctx, input.year, input.month)
        },
        [IPC.diaryListDate]: async (payload) => diarySvc.listDate(ctx, (payload as { businessDate: string }).businessDate),
        [IPC.diaryGet]: async (payload) => diarySvc.getDiary(ctx, (payload as { id: string }).id),
        [IPC.diaryCreate]: async (payload) => diarySvc.createDiary(ctx, payload as DiaryInput),
        [IPC.diaryUpdate]: async (payload) => {
            const input = payload as { id: string; input: DiaryInput }
            return diarySvc.updateDiary(ctx, input.id, input.input)
        },
        [IPC.diaryRemove]: async (payload) => {
            const input = payload as { id: string; confirm: boolean }
            return diarySvc.removeDiary(ctx, input.id, input.confirm)
        },
        [IPC.diaryGetDraft]: async (payload) => diarySvc.getDraft(ctx, (payload as DraftScope).scope),
        [IPC.diarySaveDraft]: async (payload) => {
            const input = payload as { scope: string; payload: import('@shared/types/models').DraftPayload }
            return diarySvc.saveDraft(ctx, input.scope, input.payload)
        },
        [IPC.diaryClearDraft]: async (payload) => diarySvc.clearDraft(ctx, (payload as DraftScope).scope),

        [IPC.settlementStatus]: async () => settlementSvc.settlementStatus(ctx),
        [IPC.settlementRun]: async (payload) => {
            const input = (payload ?? {}) as { businessDate?: string }
            return settlementSvc.runSettlement(ctx, input.businessDate)
        },
        [IPC.settlementSettleMissing]: async () => settlementSvc.settleMissing(ctx),

        [IPC.recordsOverview]: async (payload) => recordsSvc.overview(ctx, (payload as { businessDate: string }).businessDate),
        [IPC.recordsTrend]: async (payload) => recordsSvc.trend(ctx, payload as TrendQuery),
        [IPC.recordsArchiveDaily]: async (payload) => {
            const input = payload as ArchiveQuery
            return recordsSvc.archiveDaily(ctx, input.page, input.pageSize)
        },
        [IPC.recordsArchivePeriod]: async (payload) => recordsSvc.archivePeriod(ctx, payload as ArchivePeriodQuery),
        [IPC.recordsHistory]: async (payload) => recordsSvc.history(ctx, payload as HistoryQuery),
        [IPC.recordsDailyDetail]: async (payload) => recordsSvc.dailyDetail(ctx, (payload as { businessDate: string }).businessDate),
        [IPC.recordsSearch]: async (payload) => recordsSvc.search(ctx, (payload as { keyword: string }).keyword),

        [IPC.achievementsList]: async () => achievementSvc.getBoard(ctx),

        [IPC.backupExportJson]: async () => backupSvc.exportJson(ctx),
        [IPC.backupCreate]: async () => backupSvc.createBackup(ctx),
        [IPC.backupRestore]: async () => backupSvc.restoreBackup(ctx),
        [IPC.backupImportJson]: async () => backupSvc.importJson(ctx),
        [IPC.backupClearDemo]: async (payload) => backupSvc.clearDemo(ctx, (payload as { confirm: boolean }).confirm),
        [IPC.backupClearAll]: async (payload) => backupSvc.clearAll(ctx, (payload as ClearAllInput).confirmText),

        [IPC.windowState]: async () => ok(deps.windowBridge.getState()),
        [IPC.windowMinimize]: async () => {
            deps.windowBridge.minimize()
            return ok(undefined)
        },
        [IPC.windowToggleMaximize]: async () => ok(deps.windowBridge.toggleMaximize()),
        [IPC.windowClose]: async () => {
            deps.windowBridge.close()
            return ok(undefined)
        },
        [IPC.windowSetFullscreen]: async (payload) => ok(deps.windowBridge.setFullscreen((payload as { value: boolean }).value)),
        [IPC.windowSetMiniAlwaysOnTop]: async (payload) => {
            deps.windowBridge.setMiniAlwaysOnTop((payload as { value: boolean }).value)
            return ok(undefined)
        }
    }
}

export function registerHandlers(deps: HandlerDeps): void {
    const handlers = createHandlers(deps)
    for (const channel of INVOKE_CHANNELS) {
        ipcMain.handle(channel, async (event, payload) => {
            try {
                if (!isTrusted(event)) return fail('E_FORBIDDEN', '请求来源不可信')
                if (deps.isMiniSender(event.sender) && !isMiniAllowed(channel)) return fail('E_FORBIDDEN', '迷你计时器无权执行此操作')
                if (!LOCK_WHITELIST.has(channel) && deps.ctx.lockRequired() && !deps.ctx.unlocked) return fail('E_LOCK_REQUIRED')
                const guardError = guardPayload(channel, payload)
                if (guardError) return fail('E_VALIDATION', guardError)
                const handler = handlers[channel]
                return await handler(payload)
            } catch (error) {
                return errorToFail('ipc', error)
            }
        })
    }
}