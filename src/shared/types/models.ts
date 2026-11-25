import type { AchievementDef, Rules } from './rules'

export type ISODate = string
export type BusinessDate = string
export type Id = string

export type ThemeMode = 'paper' | 'night'
export type FontSizeMode = 'normal' | 'large'
export type EventKind = 'todo' | 'habit' | 'principle'
export type EventStatus = 'active' | 'paused' | 'ended'
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'once'
export type TargetUnit = 'times' | 'minutes' | 'quantity'
export type InstanceStatus = 'pending' | 'inProgress' | 'completed' | 'shelved' | 'skipped'
export type TagKind = 'activity' | 'emotion'
export type TimerMode = 'countup' | 'countdown'
export type TimerPurpose = 'focus' | 'rest'
export type TimerStatus = 'running' | 'paused' | 'finished' | 'abandoned'
export type ActivityKind = 'checkin' | 'timer' | 'diary' | 'goalBonus' | 'manual'
export type LedgerSourceType =
    | 'todoCompleted'
    | 'habitCheckin'
    | 'habitGoalBonus'
    | 'focusTimer'
    | 'restTimer'
    | 'diaryEntry'
    | 'diaryLong'
    | 'reversal'
export type TitleLine = 'mindfulness' | 'freedom'
export type AchievementLine = TitleLine | 'both'
export type ChangeAction = 'create' | 'update' | 'delete' | 'revoke' | 'settle' | 'import' | 'clear'

export interface DraftPayload {
    content: string
    tagIds: string[]
    intensity: number
    businessDate: BusinessDate
    savedAt: ISODate
}

export interface Profile {
    id: Id
    nickname: string
    bio: string
    avatarSeed: 1 | 2 | 3
    passHash: string | null
    passSalt: string | null
    demoDataLoaded: boolean
    createdAt: ISODate
    updatedAt: ISODate
}

export interface NotificationSettings {
    timer: boolean
    settlement: boolean
    title: boolean
    achievement: boolean
}

export interface Settings {
    timezone: 'Asia/Shanghai'
    dayBoundaryHour: number
    theme: ThemeMode
    fontSize: FontSizeMode
    motion: boolean
    sound: boolean
    notifications: NotificationSettings
    closeToTray: boolean
    launchAtLogin: boolean
    miniTimerOnTop: boolean
    globalShortcuts: boolean
    autoSettleOnStart: boolean
    aiEnabled: boolean
    guidanceSeen?: boolean
    reminderEnabled?: boolean
    reminderTime?: string
    drafts: Record<string, DraftPayload>
    schemaMigrationNote?: string
}

export interface Tag {
    id: Id
    kind: TagKind
    name: string
    mindfulnessWeight: number
    freedomWeight: number
    builtin: boolean
    emoji: string | null
    color: string | null
    softColor: string | null
    createdAt: ISODate
}

export interface Event {
    id: Id
    kind: EventKind
    title: string
    notes: string
    tagId: Id | null
    status: EventStatus
    frequency: Frequency
    targetValue: number
    targetUnit: TargetUnit
    createdAt: ISODate
    updatedAt: ISODate
    deletedAt: ISODate | null
}

export interface Instance {
    id: Id
    eventId: Id
    businessDate: BusinessDate
    windowStart: ISODate
    windowEnd: ISODate
    timezone: 'Asia/Shanghai'
    dayBoundaryHour: number
    status: InstanceStatus
    targetValue: number
    targetUnit: TargetUnit
    completedAt: ISODate | null
    createdAt: ISODate
}

export interface Activity {
    id: Id
    instanceId: Id | null
    sourceKey: string
    kind: ActivityKind
    purpose: TimerPurpose | null
    occurredAt: ISODate
    recordedAt: ISODate
    quantity: number
    durationSeconds: number
    note: string | null
    demo: boolean
    revokedAt: ISODate | null
    createdAt: ISODate
}

export interface TimerSession {
    id: Id
    instanceId: Id | null
    mode: TimerMode
    purpose: TimerPurpose
    plannedSeconds: number | null
    status: TimerStatus
    startedAt: ISODate
    resumedAt: ISODate | null
    finishedAt: ISODate | null
    accumulatedSeconds: number
    recordedActivityId: Id | null
    demo: boolean
}

export interface Diary {
    id: Id
    businessDate: BusinessDate
    content: string
    tagIds: Id[]
    intensity: 1 | 2 | 3 | 4 | 5
    createdAt: ISODate
    updatedAt: ISODate
    deletedAt: ISODate | null
    demo: boolean
}

export interface LedgerEntry {
    id: Id
    businessDate: BusinessDate
    sourceType: LedgerSourceType
    sourceId: Id
    sourceVersion: number
    mindfulnessDelta: number
    freedomDelta: number
    ruleVersion: string
    reversedBy: Id | null
    demo: boolean
    createdAt: ISODate
}

export interface Snapshot {
    businessDate: BusinessDate
    mindfulnessTotal: number
    freedomTotal: number
    mindfulnessDelta: number
    freedomDelta: number
    settledAt: ISODate
    version: number
}

export interface Verdict {
    businessDate: BusinessDate
    text: string
    polishedText: string
    templateId: string
    status: 'generated' | 'empty'
    createdAt: ISODate
}

export type Achievement = AchievementDef

export interface UserAchievement {
    achievementId: Id
    unlockedAt: ISODate
}

export interface ChangeLog {
    id: Id
    entityType: string
    entityId: Id
    action: ChangeAction
    before: string | null
    after: string | null
    createdAt: ISODate
}

export interface DemoMeta {
    loaded: boolean
    eventIds: Id[]
    instanceIds: Id[]
    activityIds: Id[]
    diaryIds: Id[]
    ledgerIds: Id[]
    snapshotDates: BusinessDate[]
    timerIds: Id[]
}

export interface MetaInfo {
    demo: DemoMeta
    counters: { exportCount: number; settlementCount: number }
    security: { failedAttempts: number; lockedUntil: ISODate | null }
    lastBackup: { startup: ISODate | null; daily: BusinessDate | null }
    lastDailyBoundaryRoll: BusinessDate | null
    lastPromotedTitle: { mindfulness: number; freedom: number }
}

export interface DataDocument {
    schemaVersion: number
    appVersion: string
    updatedAt: ISODate
    profile: Profile | null
    settings: Settings
    tags: Tag[]
    events: Event[]
    instances: Instance[]
    activities: Activity[]
    timerSessions: TimerSession[]
    diaries: Diary[]
    ledgerEntries: LedgerEntry[]
    snapshots: Snapshot[]
    verdicts: Verdict[]
    achievements: Achievement[]
    userAchievements: UserAchievement[]
    changeLogs: ChangeLog[]
    rules: Rules
    meta: MetaInfo
}