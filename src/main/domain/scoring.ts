import type { LedgerEntry, Tag } from '@shared/types/models'
import type { Rules, ScoringBase } from '@shared/types/rules'

export type ScoreSource = 'todoCompleted' | 'habitCheckin' | 'habitGoalBonus' | 'focusTimer' | 'diaryEntry' | 'diaryLong'

export interface ScoreInput {
    source: ScoreSource
    units?: number
    tag: Tag | null
    dayNet: { mindfulness: number; freedom: number }
    rules: Rules
}

export interface ScoreResult {
    mindfulness: number
    freedom: number
}

export function round1(value: number): number {
    return Math.round(value * 10 + 1e-9) / 10
}

function baseOf(source: ScoreSource, rules: Rules): ScoringBase {
    switch (source) {
        case 'todoCompleted':
            return rules.scoring.todoCompleted
        case 'habitCheckin':
            return rules.scoring.habitCheckin
        case 'habitGoalBonus':
            return rules.scoring.habitGoalBonus
        case 'focusTimer':
            return rules.scoring.focusPer10Min
        case 'diaryEntry':
            return rules.scoring.diaryEntry
        case 'diaryLong':
            return rules.scoring.diaryLongBonus
        default:
            return { mindfulness: 0, freedom: 0 }
    }
}

export function unitsOfFocus(durationSeconds: number): number {
    return Math.max(0, Math.floor(durationSeconds / 600))
}

export function computeScore(input: ScoreInput): ScoreResult {
    const { source, tag, dayNet, rules } = input
    const base = baseOf(source, rules)
    const units = source === 'focusTimer' ? Math.max(0, Math.floor(input.units ?? 0)) : 1
    const coefficientBase = rules.tagCoefficient.base
    const coeffM = coefficientBase + (tag ? tag.mindfulnessWeight : 0.5)
    const coeffF = coefficientBase + (tag ? tag.freedomWeight : 0.5)

    let mindfulness = round1(base.mindfulness * units * coeffM)
    let freedom = round1(base.freedom * units * coeffF)

    mindfulness = Math.min(mindfulness, rules.scoring.perEntryCap)
    freedom = Math.min(freedom, rules.scoring.perEntryCap)

    const remainM = Math.max(0, rules.scoring.perDayCap - Math.max(0, dayNet.mindfulness))
    const remainF = Math.max(0, rules.scoring.perDayCap - Math.max(0, dayNet.freedom))

    mindfulness = Math.max(0, Math.min(mindfulness, remainM))
    freedom = Math.max(0, Math.min(freedom, remainF))

    return { mindfulness: round1(mindfulness), freedom: round1(freedom) }
}

export function netOfEntries(entries: LedgerEntry[]): { mindfulness: number; freedom: number } {
    let mindfulness = 0
    let freedom = 0
    for (const entry of entries) {
        mindfulness += entry.mindfulnessDelta
        freedom += entry.freedomDelta
    }
    return { mindfulness: round1(mindfulness), freedom: round1(freedom) }
}

export function reversalOf(entry: LedgerEntry): ScoreResult {
    return { mindfulness: round1(-entry.mindfulnessDelta), freedom: round1(-entry.freedomDelta) }
}