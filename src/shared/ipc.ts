import type { Result, AppError } from './result'
import type { Rules } from './types/rules'
import type {
    Activity,
    DraftPayload,
    EventStatus,
    Id,
    Profile,
    Settings,
    Tag
} from './types/models'
import type {
    AchievementBoard,
    AchievementUnlock,
    ActivityListQuery,
    ActivityResult,
    ArchiveDailyResult,
    ArchivePeriodQuery,
    ArchivePeriodResult,
    ArchiveQuery,
    Bootstrap,
    CheckInInput,
    ClearAllInput,
    ClearDemoResult,
    CreateProfileInput,
    CreateTagInput,
    DailyDetail,
    DataChangedPayload,
    DiaryInput,
    DiaryMonthView,
    DiarySaveResult,
    DiaryView,
    DraftScope,
    EventDetail,
    EventInput,
    EventListQuery,
    EventListResult,
    ExportFileResult,
    FileOpResult,
    GenerateResult,
    HistoryQuery,
    HistoryResult,
    InstanceDayQuery,
    InstanceView,
    LockState,
    NavigatePayload,
    RecordsOverview,
    RevokeInput,
    SearchResult,
    SetInstanceStatusInput,
    SetPassphraseInput,
    SettleMissingResult,
    SettlementResult,
    SettlementStatus,
    SettingsPatch,
    TimerFinishResult,
    TimerOpenMiniResult,
    TimerRecordInput,
    TimerRecordResult,
    TimerStartInput,
    TimerState,
    TitlePromotion,
    TrendQuery,
    TrendResult,
    UnlockResult,
    UpdateProfileInput,
    UpdateTagInput,
    VersionInfo,
    WindowState
} from './types/dto'

export const IPC = {
    appBootstrap: 'moyu:app:bootstrap',
    appVersion: 'moyu:app:version',
    appOpenDataDir: 'moyu:app:open-data-dir',
    appOpenRulesFile: 'moyu:app:open-rules-file',
    appQuit: 'moyu:app:quit',

    profileGet: 'moyu:profile:get',
    profileCreate: 'moyu:profile:create',
    profileUpdate: 'moyu:profile:update',
    profileSetPassphrase: 'moyu:profile:set-passphrase',
    profileVerifyPassphrase: 'moyu:profile:verify-passphrase',
    profileClearPassphrase: 'moyu:profile:clear-passphrase',
    profileLockState: 'moyu:profile:lock-state',

    settingsGet: 'moyu:settings:get',
    settingsPatch: 'moyu:settings:patch',
    rulesReset: 'moyu:rules:reset',

    tagsList: 'moyu:tags:list',
    tagsCreate: 'moyu:tags:create',
    tagsUpdate: 'moyu:tags:update',
    tagsRemove: 'moyu:tags:remove',

    eventsList: 'moyu:events:list',
    eventsGet: 'moyu:events:get',
    eventsCreate: 'moyu:events:create',
    eventsUpdate: 'moyu:events:update',
    eventsChangeStatus: 'moyu:events:change-status',
    eventsRemove: 'moyu:events:remove',

    instancesListByDate: 'moyu:instances:list-by-date',
    instancesGenerateToday: 'moyu:instances:generate-today',
    instancesSetStatus: 'moyu:instances:set-status',

    activitiesCheckIn: 'moyu:activities:check-in',
    activitiesList: 'moyu:activities:list',
    activitiesRevoke: 'moyu:activities:revoke',

    timerState: 'moyu:timer:state',
    timerStart: 'moyu:timer:start',
    timerPause: 'moyu:timer:pause',
    timerResume: 'moyu:timer:resume',
    timerFinish: 'moyu:timer:finish',
    timerRecord: 'moyu:timer:record',
    timerDiscard: 'moyu:timer:discard',
    timerOpenMini: 'moyu:timer:open-mini',

    diaryListMonth: 'moyu:diary:list-month',
    diaryListDate: 'moyu:diary:list-date',
    diaryGet: 'moyu:diary:get',
    diaryCreate: 'moyu:diary:create',
    diaryUpdate: 'moyu:diary:update',
    diaryRemove: 'moyu:diary:remove',
    diaryGetDraft: 'moyu:diary:get-draft',
    diarySaveDraft: 'moyu:diary:save-draft',
    diaryClearDraft: 'moyu:diary:clear-draft',

    settlementStatus: 'moyu:settlement:status',
    settlementRun: 'moyu:settlement:run',
    settlementSettleMissing: 'moyu:settlement:settle-missing',

    recordsOverview: 'moyu:records:overview',
    recordsTrend: 'moyu:records:trend',
    recordsArchiveDaily: 'moyu:records:archive-daily',
    recordsArchivePeriod: 'moyu:records:archive-period',
    recordsHistory: 'moyu:records:history',
    recordsDailyDetail: 'moyu:records:daily-detail',
    recordsSearch: 'moyu:records:search',

    achievementsList: 'moyu:achievements:list',

    backupExportJson: 'moyu:backup:export-json',
    backupCreate: 'moyu:backup:create',
    backupRestore: 'moyu:backup:restore',
    backupImportJson: 'moyu:backup:import-json',
    backupClearDemo: 'moyu:backup:clear-demo',
    backupClearAll: 'moyu:backup:clear-all',

    windowState: 'moyu:window:state',
    windowMinimize: 'moyu:window:minimize',
    windowToggleMaximize: 'moyu:window:toggle-maximize',
    windowClose: 'moyu:window:close',
    windowSetFullscreen: 'moyu:window:set-fullscreen',
    windowSetMiniAlwaysOnTop: 'moyu:window:set-mini-always-on-top'
} as const

export const EVENT_CHANNELS = {
    dataChanged: 'moyu:event:data-changed',
    timerState: 'moyu:event:timer-state',
    timerFinished: 'moyu:event:timer-finished',
    settlementCompleted: 'moyu:event:settlement-completed',
    titlePromoted: 'moyu:event:title-promoted',
    achievementUnlocked: 'moyu:event:achievement-unlocked',
    navigate: 'moyu:event:navigate',
    windowState: 'moyu:event:window-state',
    error: 'moyu:event:error'
} as const

export type InvokeChannel = (typeof IPC)[keyof typeof IPC]
export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS]

export const INVOKE_CHANNELS: InvokeChannel[] = Object.values(IPC)
export const EVENT_LIST: EventChannel[] = Object.values(EVENT_CHANNELS)

export interface ChannelMap {
    [IPC.appBootstrap]: { req: void; res: Bootstrap }
    [IPC.appVersion]: { req: void; res: VersionInfo }
    [IPC.appOpenDataDir]: { req: void; res: void }
    [IPC.appOpenRulesFile]: { req: void; res: void }
    [IPC.appQuit]: { req: void; res: void }

    [IPC.profileGet]: { req: void; res: Profile | null }
    [IPC.profileCreate]: { req: CreateProfileInput; res: Bootstrap }
    [IPC.profileUpdate]: { req: UpdateProfileInput; res: Profile }
    [IPC.profileSetPassphrase]: { req: SetPassphraseInput; res: void }
    [IPC.profileVerifyPassphrase]: { req: { passphrase: string }; res: UnlockResult }
    [IPC.profileClearPassphrase]: { req: { passphrase: string; confirmText: string }; res: void }
    [IPC.profileLockState]: { req: void; res: LockState }

    [IPC.settingsGet]: { req: void; res: Settings }
    [IPC.settingsPatch]: { req: SettingsPatch; res: Settings }
    [IPC.rulesReset]: { req: void; res: Rules }

    [IPC.tagsList]: { req: void; res: Tag[] }
    [IPC.tagsCreate]: { req: CreateTagInput; res: Tag }
    [IPC.tagsUpdate]: { req: UpdateTagInput; res: Tag }
    [IPC.tagsRemove]: { req: { id: Id }; res: void }

    [IPC.eventsList]: { req: EventListQuery; res: EventListResult }
    [IPC.eventsGet]: { req: { id: Id }; res: EventDetail }
    [IPC.eventsCreate]: { req: EventInput; res: EventDetail }
    [IPC.eventsUpdate]: { req: { id: Id; input: EventInput }; res: EventDetail }
    [IPC.eventsChangeStatus]: { req: { id: Id; status: EventStatus }; res: EventDetail }
    [IPC.eventsRemove]: { req: { id: Id; confirm: true }; res: void }

    [IPC.instancesListByDate]: { req: InstanceDayQuery; res: InstanceView[] }
    [IPC.instancesGenerateToday]: { req: void; res: GenerateResult }
    [IPC.instancesSetStatus]: { req: SetInstanceStatusInput; res: InstanceView }

    [IPC.activitiesCheckIn]: { req: CheckInInput; res: ActivityResult }
    [IPC.activitiesList]: { req: ActivityListQuery; res: Activity[] }
    [IPC.activitiesRevoke]: { req: RevokeInput; res: ActivityResult }

    [IPC.timerState]: { req: void; res: TimerState }
    [IPC.timerStart]: { req: TimerStartInput; res: TimerState }
    [IPC.timerPause]: { req: void; res: TimerState }
    [IPC.timerResume]: { req: void; res: TimerState }
    [IPC.timerFinish]: { req: void; res: TimerFinishResult }
    [IPC.timerRecord]: { req: TimerRecordInput; res: TimerRecordResult }
    [IPC.timerDiscard]: { req: void; res: TimerState }
    [IPC.timerOpenMini]: { req: void; res: TimerOpenMiniResult }

    [IPC.diaryListMonth]: { req: { year: number; month: number }; res: DiaryMonthView }
    [IPC.diaryListDate]: { req: { businessDate: string }; res: DiaryView[] }
    [IPC.diaryGet]: { req: { id: Id }; res: DiaryView }
    [IPC.diaryCreate]: { req: DiaryInput; res: DiarySaveResult }
    [IPC.diaryUpdate]: { req: { id: Id; input: DiaryInput }; res: DiarySaveResult }
    [IPC.diaryRemove]: { req: { id: Id; confirm: true }; res: DiarySaveResult }
    [IPC.diaryGetDraft]: { req: DraftScope; res: DraftPayload | null }
    [IPC.diarySaveDraft]: { req: { scope: string; payload: DraftPayload }; res: { savedAt: string } }
    [IPC.diaryClearDraft]: { req: DraftScope; res: void }

    [IPC.settlementStatus]: { req: void; res: SettlementStatus }
    [IPC.settlementRun]: { req: { businessDate?: string }; res: SettlementResult }
    [IPC.settlementSettleMissing]: { req: void; res: SettleMissingResult }

    [IPC.recordsOverview]: { req: { businessDate: string }; res: RecordsOverview }
    [IPC.recordsTrend]: { req: TrendQuery; res: TrendResult }
    [IPC.recordsArchiveDaily]: { req: ArchiveQuery; res: ArchiveDailyResult }
    [IPC.recordsArchivePeriod]: { req: ArchivePeriodQuery; res: ArchivePeriodResult }
    [IPC.recordsHistory]: { req: HistoryQuery; res: HistoryResult }
    [IPC.recordsDailyDetail]: { req: { businessDate: string }; res: DailyDetail }
    [IPC.recordsSearch]: { req: { keyword: string }; res: SearchResult }

    [IPC.achievementsList]: { req: void; res: AchievementBoard }

    [IPC.backupExportJson]: { req: void; res: FileOpResult }
    [IPC.backupCreate]: { req: void; res: ExportFileResult }
    [IPC.backupRestore]: { req: void; res: FileOpResult }
    [IPC.backupImportJson]: { req: void; res: FileOpResult }
    [IPC.backupClearDemo]: { req: { confirm: true }; res: ClearDemoResult }
    [IPC.backupClearAll]: { req: ClearAllInput; res: void }

    [IPC.windowState]: { req: void; res: WindowState }
    [IPC.windowMinimize]: { req: void; res: void }
    [IPC.windowToggleMaximize]: { req: void; res: WindowState }
    [IPC.windowClose]: { req: void; res: void }
    [IPC.windowSetFullscreen]: { req: { value: boolean }; res: WindowState }
    [IPC.windowSetMiniAlwaysOnTop]: { req: { value: boolean }; res: void }
}

export interface MoyuApi {
    app: {
        bootstrap(): Promise<Result<Bootstrap>>
        version(): Promise<Result<VersionInfo>>
        openDataDir(): Promise<Result<void>>
        openRulesFile(): Promise<Result<void>>
        quit(): Promise<Result<void>>
    }
    profile: {
        get(): Promise<Result<Profile | null>>
        create(input: CreateProfileInput): Promise<Result<Bootstrap>>
        update(patch: UpdateProfileInput): Promise<Result<Profile>>
        setPassphrase(input: SetPassphraseInput): Promise<Result<void>>
        verifyPassphrase(input: { passphrase: string }): Promise<Result<UnlockResult>>
        clearPassphrase(input: { passphrase: string; confirmText: string }): Promise<Result<void>>
        lockState(): Promise<Result<LockState>>
    }
    settings: {
        get(): Promise<Result<Settings>>
        patch(patch: SettingsPatch): Promise<Result<Settings>>
    }
    rules: {
        reset(): Promise<Result<Rules>>
    }
    tags: {
        list(): Promise<Result<Tag[]>>
        create(input: CreateTagInput): Promise<Result<Tag>>
        update(input: UpdateTagInput): Promise<Result<Tag>>
        remove(id: Id): Promise<Result<void>>
    }
    events: {
        list(query: EventListQuery): Promise<Result<EventListResult>>
        get(id: Id): Promise<Result<EventDetail>>
        create(input: EventInput): Promise<Result<EventDetail>>
        update(id: Id, input: EventInput): Promise<Result<EventDetail>>
        changeStatus(id: Id, status: EventStatus): Promise<Result<EventDetail>>
        remove(id: Id, confirm: boolean): Promise<Result<void>>
    }
    instances: {
        listByDate(businessDate: string): Promise<Result<InstanceView[]>>
        generateToday(): Promise<Result<GenerateResult>>
        setStatus(input: SetInstanceStatusInput): Promise<Result<InstanceView>>
    }
    activities: {
        checkIn(input: CheckInInput): Promise<Result<ActivityResult>>
        list(query: ActivityListQuery): Promise<Result<Activity[]>>
        revoke(input: RevokeInput): Promise<Result<ActivityResult>>
    }
    timer: {
        state(): Promise<Result<TimerState>>
        start(input: TimerStartInput): Promise<Result<TimerState>>
        pause(): Promise<Result<TimerState>>
        resume(): Promise<Result<TimerState>>
        finish(): Promise<Result<TimerFinishResult>>
        record(input: TimerRecordInput): Promise<Result<TimerRecordResult>>
        discard(): Promise<Result<TimerState>>
        openMini(): Promise<Result<TimerOpenMiniResult>>
    }
    diary: {
        listMonth(input: { year: number; month: number }): Promise<Result<DiaryMonthView>>
        listDate(businessDate: string): Promise<Result<DiaryView[]>>
        get(id: Id): Promise<Result<DiaryView>>
        create(input: DiaryInput): Promise<Result<DiarySaveResult>>
        update(id: Id, input: DiaryInput): Promise<Result<DiarySaveResult>>
        remove(id: Id, confirm: boolean): Promise<Result<DiarySaveResult>>
        getDraft(scope: DraftScope): Promise<Result<DraftPayload | null>>
        saveDraft(scope: string, payload: DraftPayload): Promise<Result<{ savedAt: string }>>
        clearDraft(scope: DraftScope): Promise<Result<void>>
    }
    settlement: {
        status(): Promise<Result<SettlementStatus>>
        run(input?: { businessDate?: string }): Promise<Result<SettlementResult>>
        settleMissing(): Promise<Result<SettleMissingResult>>
    }
    records: {
        overview(input: { businessDate: string }): Promise<Result<RecordsOverview>>
        trend(input: TrendQuery): Promise<Result<TrendResult>>
        archiveDaily(input: ArchiveQuery): Promise<Result<ArchiveDailyResult>>
        archivePeriod(input: ArchivePeriodQuery): Promise<Result<ArchivePeriodResult>>
        history(input: HistoryQuery): Promise<Result<HistoryResult>>
        dailyDetail(businessDate: string): Promise<Result<DailyDetail>>
        search(keyword: string): Promise<Result<SearchResult>>
    }
    achievements: {
        list(): Promise<Result<AchievementBoard>>
    }
    backup: {
        exportJson(): Promise<Result<FileOpResult>>
        create(): Promise<Result<ExportFileResult>>
        restore(): Promise<Result<FileOpResult>>
        importJson(): Promise<Result<FileOpResult>>
        clearDemo(confirm: boolean): Promise<Result<ClearDemoResult>>
        clearAll(input: ClearAllInput): Promise<Result<void>>
    }
    window: {
        state(): Promise<Result<WindowState>>
        minimize(): Promise<Result<void>>
        toggleMaximize(): Promise<Result<WindowState>>
        close(): Promise<Result<void>>
        setFullscreen(value: boolean): Promise<Result<WindowState>>
        setMiniAlwaysOnTop(value: boolean): Promise<Result<void>>
    }
    on: {
        dataChanged(cb: (payload: DataChangedPayload) => void): () => void
        timerState(cb: (payload: TimerState) => void): () => void
        timerFinished(cb: (payload: TimerFinishResult) => void): () => void
        settlementCompleted(cb: (payload: SettlementResult) => void): () => void
        titlePromoted(cb: (payload: TitlePromotion) => void): () => void
        achievementUnlocked(cb: (payload: AchievementUnlock[]) => void): () => void
        navigate(cb: (payload: NavigatePayload) => void): () => void
        windowState(cb: (payload: WindowState) => void): () => void
        error(cb: (payload: AppError) => void): () => void
    }
}

export const MOYU_API_METHOD_COUNT = 71