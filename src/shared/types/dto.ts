import type {
    Activity,
    BusinessDate,
    Diary,
    Event,
    EventKind,
    EventStatus,
    Frequency,
    ISODate,
    Id,
    Instance,
    LedgerEntry,
    Profile,
    Settings,
    Snapshot,
    TargetUnit,
    TimerMode,
    TimerPurpose,
    TimerSession,
    TitleLine,
    UserAchievement,
    Verdict
} from './models'
import type { AchievementDef } from './rules'

export interface VersionInfo {
    appVersion: string
    buildTime: string
    electron: string
    chrome: string
    node: string
}

export interface LockState {
    required: boolean
    failedAttempts: number
    lockedUntil: ISODate | null
    retryAfterMs: number
}

export interface UnlockResult {
    unlocked: true
    retryAfterMs: 0
}

export interface TitleLevelState {
    line: TitleLine
    name: string
    level: number
    score: number
    nextName: string | null
    nextThreshold: number | null
    progress: number
    maxed: boolean
}

export interface TitleState {
    mindfulness: TitleLevelState
    freedom: TitleLevelState
}

export interface DayTotals {
    businessDate: BusinessDate
    mindfulnessDelta: number
    freedomDelta: number
    mindfulnessTotal: number
    freedomTotal: number
    settled: boolean
}

export interface InstanceView extends Instance {
    eventTitle: string
    eventKind: EventKind
    tagId: Id | null
    tagName: string | null
    progressValue: number
    progressRatio: number
    overTarget: boolean
}

export interface TodayPayload {
    businessDate: BusinessDate
    instances: InstanceView[]
    dayTotals: DayTotals
    missing: number
}

export interface Bootstrap {
    profile: Profile | null
    settings: Settings
    titles: TitleState
    lockRequired: boolean
    lockState: LockState
    today: TodayPayload
    demoDataLoaded: boolean
    settlePending: boolean
    version: VersionInfo
}

export interface CreateProfileInput {
    nickname: string
    bio: string
    passphrase?: string
    dayBoundaryHour: number
    loadDemo: boolean
    avatarSeed: 1 | 2 | 3
}

export interface UpdateProfileInput {
    nickname?: string
    bio?: string
    avatarSeed?: 1 | 2 | 3
}

export interface SetPassphraseInput {
    oldPassphrase?: string
    newPassphrase: string
}

export interface SettingsPatch {
    dayBoundaryHour?: number
    theme?: 'paper' | 'night'
    fontSize?: 'normal' | 'large'
    motion?: boolean
    sound?: boolean
    notifications?: Partial<Settings['notifications']>
    closeToTray?: boolean
    launchAtLogin?: boolean
    miniTimerOnTop?: boolean
    globalShortcuts?: boolean
    autoSettleOnStart?: boolean
    aiEnabled?: boolean
    guidanceSeen?: boolean
}

export interface EventInput {
    kind: EventKind
    title: string
    notes: string
    tagId: Id | null
    frequency: Frequency
    targetValue: number
    targetUnit: TargetUnit
}

export interface EventDetail extends Event {
    tagName: string | null
    tagColor: string | null
    todayInstance: InstanceView | null
    completionRate14: number
}

export type EventSort = 'recent' | 'completed' | 'progress'

export interface EventListQuery {
    kind?: EventKind
    status?: EventStatus
    tagId?: Id
    sort: EventSort
    keyword: string
    page: number
    pageSize: number
}

export interface EventListResult {
    items: EventDetail[]
    total: number
    countsByKind: Record<EventKind, number>
    countsByStatus: Record<EventStatus, number>
}

export interface CheckInInput {
    instanceId: Id
    requestId: string
    quantity?: number
    durationSeconds?: number
    note?: string
}

export interface RevokeInput {
    activityId: Id
    requestId: string
}

export interface ActivityView extends Activity {
    eventTitle: string | null
    instanceBusinessDate: BusinessDate | null
}

export interface ActivityResult {
    activity: ActivityView
    ledger: LedgerEntry[]
    instance: InstanceView | null
    dayTotals: DayTotals
}

export interface ActivityListQuery {
    businessDate?: BusinessDate
    instanceId?: Id
    page: number
    pageSize: number
}

export interface TimerStartInput {
    mode: TimerMode
    purpose: TimerPurpose
    plannedMinutes?: number
    instanceId?: Id
}

export interface TimerActiveState {
    id: Id
    mode: TimerMode
    purpose: TimerPurpose
    status: 'running' | 'paused'
    plannedSeconds: number | null
    elapsedSeconds: number
    remainingSeconds: number | null
    accumulatedSeconds: number
    resumedAt: ISODate | null
    instanceId: Id | null
    instanceTitle: string | null
    startedAt: ISODate
}

export interface TimerState {
    active: TimerActiveState | null
    miniWindowOpen: boolean
}

export interface TimerFinishResult {
    session: TimerSession
    focusMinutes: number
    canRecord: boolean
    defaultInstanceId: Id | null
}

export interface TimerRecordInput {
    sessionId: Id
    instanceId?: Id
}

export interface TimerRecordResult {
    activity: ActivityView
    ledger: LedgerEntry[]
    instance: InstanceView | null
    dayTotals: DayTotals
}

export interface DiaryInput {
    businessDate: BusinessDate
    content: string
    tagIds: Id[]
    intensity: 1 | 2 | 3 | 4 | 5
}

export interface DiaryEmotionMark {
    tagId: Id
    name: string
    emoji: string
    color: string
    softColor: string
}

export interface DiaryView extends Diary {
    emotions: DiaryEmotionMark[]
}

export interface DiaryDayMark {
    businessDate: BusinessDate
    count: number
    emotions: DiaryEmotionMark[]
    maxIntensity: number
}

export interface EmotionSlice {
    tagId: Id
    name: string
    emoji: string
    color: string
    softColor: string
    count: number
    ratio: number
}

export interface DiaryMonthView {
    days: DiaryDayMark[]
    distribution: EmotionSlice[]
}

export interface DiarySaveResult {
    diary: DiaryView
    ledger: LedgerEntry[]
    dayTotals: DayTotals
    recalculatedDates: BusinessDate[]
}

export interface DraftScope {
    scope: string
}

export interface SettlementResult {
    businessDate: BusinessDate
    snapshot: Snapshot
    verdict: Verdict
    promotions: TitlePromotion[]
    unlocked: AchievementUnlock[]
    durationMs: number
}

export interface SettlementStatus {
    latestSettledDate: BusinessDate | null
    pendingDates: BusinessDate[]
    running: boolean
}

export interface TitlePromotion {
    line: TitleLine
    from: number
    to: number
    score: number
}

export interface AchievementUnlock {
    achievementId: Id
    name: string
    emoji: string
    unlockedAt: ISODate
}

export interface RecordsOverview {
    businessDate: BusinessDate
    totals: { mindfulness: number; freedom: number }
    todayDelta: { mindfulness: number; freedom: number }
    sparkline14: Array<{ date: BusinessDate; mindfulness: number; freedom: number }>
    verdict: Verdict | null
    todayStats: { records: number; focusMinutes: number; restMinutes: number; emotionKinds: number }
    demoFlag: boolean
    settled: boolean
}

export type TrendKind = 'focus' | 'rest' | 'emotion' | 'values'

export interface TrendQuery {
    kind: TrendKind
    rangeStart: BusinessDate
    rangeEnd: BusinessDate
}

export interface TrendPoint {
    date: BusinessDate
    value: number
}

export interface TrendResult {
    kind: TrendKind
    points: TrendPoint[]
    summary: { total: number; avg: number; max: number; unit: string }
    empty: boolean
    emotionBreakdown: EmotionSlice[]
    intensityPoints: TrendPoint[]
    valueSeries?: {
        mindfulness: TrendPoint[]
        freedom: TrendPoint[]
    }
}

export interface ArchiveQuery {
    page: number
    pageSize: number
}

export interface DailyArchiveCard {
    businessDate: BusinessDate
    mindfulnessDelta: number
    freedomDelta: number
    verdictText: string | null
    emotions: DiaryEmotionMark[]
    recordCount: number
    focusMinutes: number
    activities: ActivityView[]
    diaries: Array<{ id: Id; businessDate: BusinessDate; content: string; emotions: DiaryEmotionMark[]; intensity: number }>
}

export interface ArchiveDailyResult {
    items: DailyArchiveCard[]
    total: number
}

export interface PeriodCard {
    key: string
    label: string
    start: BusinessDate
    end: BusinessDate
    series: Array<{ date: BusinessDate; mindfulness: number; freedom: number }>
    summary: string[]
    bestDay: { date: BusinessDate; mindfulness: number; freedom: number } | null
    focusMinutes: number
    topEmotions: Array<{ name: string; emoji: string; count: number }>
}

export interface ArchivePeriodResult {
    items: PeriodCard[]
    pendingDates: BusinessDate[]
}

export type HistorySortBy = 'date' | 'mindfulness' | 'freedom' | 'focus' | 'records'

export interface HistoryQuery {
    sortBy: HistorySortBy
    sortDir: 'asc' | 'desc'
    page: number
    pageSize: number
}

export interface HistoryRow {
    date: BusinessDate
    mindfulness: number
    freedom: number
    focusMinutes: number
    records: number
    verdictText: string
}

export interface HistoryResult {
    rows: HistoryRow[]
    total: number
}

export interface DailyDetail {
    businessDate: BusinessDate
    activities: ActivityView[]
    diaries: DiaryView[]
    verdict: Verdict | null
}

export interface SearchItem {
    id: string
    label: string
    hint: string
    route: string | null
    action: string | null
}

export interface SearchResult {
    pages: SearchItem[]
    events: SearchItem[]
    diaries: SearchItem[]
    actions: SearchItem[]
}

export interface AchievementStats {
    firstActivity: boolean
    focusSeconds: number
    diaryCount: number
    todoCompletedCount: number
    habitStreak: number
    recordStreak: number
    diaryStreak: number
    titleCount: number
    freedomTotal: number
    exportCount: number
    earlyLate: { early: boolean; late: boolean }
}

export interface AchievementBoard {
    items: AchievementDef[]
    unlocked: UserAchievement[]
    titles: TitleState
    stats: AchievementStats
    counts: { unlocked: number; total: number }
}

export interface FileOpResult {
    canceled: boolean
    path: string | null
}

export interface ClearDemoResult {
    removed: number
    recalculatedDates: BusinessDate[]
}

export interface DataChangedPayload {
    scope: 'instances' | 'activities' | 'diary' | 'settings' | 'profile' | 'events' | 'achievements' | 'settlement'
    businessDate?: BusinessDate
    ids?: Id[]
}

export interface WindowState {
    maximized: boolean
    fullscreen: boolean
    focused: boolean
}

export interface NavigatePayload {
    route: string
    query?: Record<string, string>
}

export interface SearchQuery {
    keyword: string
}

export interface CreateTagInput {
    kind: 'activity' | 'emotion'
    name: string
    mWeight: number
    fWeight: number
}

export interface UpdateTagInput {
    id: Id
    name?: string
    mWeight?: number
    fWeight?: number
}

export interface InstanceDayQuery {
    businessDate: BusinessDate
}

export interface GenerateResult {
    created: number
    missing: number
}

export interface SetInstanceStatusInput {
    instanceId: Id
    status: 'shelved' | 'skipped' | 'pending'
}

export interface TimerOpenMiniResult {
    opened: boolean
    focused: boolean
}

export interface SettleMissingResult {
    settledDates: BusinessDate[]
    failedDates: BusinessDate[]
}

export interface ArchivePeriodQuery {
    period: 'weekly' | 'monthly'
    page: number
    pageSize: number
}

export interface ClearAllInput {
    confirmText: string
}

export interface ExportFileResult extends FileOpResult {
    path: string
}