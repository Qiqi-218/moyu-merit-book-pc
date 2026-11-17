import type { DataDocument, DemoMeta, MetaInfo } from '@shared/types/models'
import { SCHEMA_VERSION, createBuiltinTags, createDefaultSettings } from '@shared/constants'
import { DEFAULT_RULES } from '@shared/defaultRules'

export function emptyDemoMeta(): DemoMeta {
    return {
        loaded: false,
        eventIds: [],
        instanceIds: [],
        activityIds: [],
        diaryIds: [],
        ledgerIds: [],
        snapshotDates: [],
        timerIds: []
    }
}

export function createMeta(): MetaInfo {
    return {
        demo: emptyDemoMeta(),
        counters: { exportCount: 0, settlementCount: 0 },
        security: { failedAttempts: 0, lockedUntil: null },
        lastBackup: { startup: null, daily: null },
        lastDailyBoundaryRoll: null,
        lastPromotedTitle: { mindfulness: 0, freedom: 0 }
    }
}

export function createEmptyDocument(appVersion: string, nowIso: string): DataDocument {
    return {
        schemaVersion: SCHEMA_VERSION,
        appVersion,
        updatedAt: nowIso,
        profile: null,
        settings: createDefaultSettings(),
        tags: createBuiltinTags(nowIso),
        events: [],
        instances: [],
        activities: [],
        timerSessions: [],
        diaries: [],
        ledgerEntries: [],
        snapshots: [],
        verdicts: [],
        achievements: DEFAULT_RULES.achievements.map((item) => ({ ...item })),
        userAchievements: [],
        changeLogs: [],
        rules: structuredClone(DEFAULT_RULES),
        meta: createMeta()
    }
}