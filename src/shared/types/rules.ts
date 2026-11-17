export type AchievementLine = 'mindfulness' | 'freedom' | 'both'

export type AchievementConditionType =
    | 'firstActivity'
    | 'focusSeconds'
    | 'diaryDayStreak'
    | 'diaryCount'
    | 'todoCompletedCount'
    | 'habitDayStreak'
    | 'titleCount'
    | 'freedomTotal'
    | 'recordDayStreak'
    | 'exportCount'
    | 'earlyLate'

export interface TitleDef {
    name: string
    threshold: number
}

export interface ScoringBase {
    mindfulness: number
    freedom: number
}

export interface ScoringRules {
    todoCompleted: ScoringBase
    habitCheckin: ScoringBase
    habitGoalBonus: ScoringBase
    focusPer10Min: ScoringBase
    diaryEntry: ScoringBase
    diaryLongBonus: ScoringBase
    perEntryCap: number
    perDayCap: number
    diaryScoredLimit: number
    longDiaryThreshold: number
}

export interface AchievementDef {
    id: string
    name: string
    line: AchievementLine
    conditionType: AchievementConditionType
    threshold: number
    description: string
    emoji: string
    sort: number
}

export type VerdictTier = 'mindfulness' | 'freedom' | 'balanced'

export interface VerdictTemplate {
    id: string
    tier: VerdictTier
    simple: string
    polished: string
}

export interface Rules {
    rulesVersion: string
    scoring: ScoringRules
    tagCoefficient: { base: number }
    titles: {
        mindfulness: TitleDef[]
        freedom: TitleDef[]
    }
    achievements: AchievementDef[]
    verdictTemplates: VerdictTemplate[]
}