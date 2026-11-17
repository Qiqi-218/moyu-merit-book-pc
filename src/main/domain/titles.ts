import type { TitleDef } from '@shared/types/rules'
import type { TitleLevelState, TitlePromotion, TitleState } from '@shared/types/dto'
import type { TitleLine } from '@shared/types/models'

function safeDefs(defs: TitleDef[]): TitleDef[] {
    if (defs.length === 0) return [{ name: '凡人', threshold: 0 }]
    return [...defs].sort((a, b) => a.threshold - b.threshold)
}

export function levelIndexOf(defs: TitleDef[], score: number): number {
    const list = safeDefs(defs)
    let level = 0
    for (let i = 0; i < list.length; i += 1) {
        const def = list[i]
        if (def && score >= def.threshold) level = i
    }
    return level
}

export function buildTitleLevel(line: TitleLine, defs: TitleDef[], score: number): TitleLevelState {
    const list = safeDefs(defs)
    const level = levelIndexOf(list, score)
    const current = list[level] ?? { name: '凡人', threshold: 0 }
    const next = list[level + 1]
    if (!next) {
        return {
            line,
            name: current.name,
            level,
            score,
            nextName: null,
            nextThreshold: null,
            progress: 1,
            maxed: true
        }
    }
    const span = next.threshold - current.threshold
    const progress = span > 0 ? Math.max(0, Math.min(1, (score - current.threshold) / span)) : 0
    return {
        line,
        name: current.name,
        level,
        score,
        nextName: next.name,
        nextThreshold: next.threshold,
        progress,
        maxed: false
    }
}

export function buildTitleState(mindfulnessDefs: TitleDef[], freedomDefs: TitleDef[], mindfulnessScore: number, freedomScore: number): TitleState {
    return {
        mindfulness: buildTitleLevel('mindfulness', mindfulnessDefs, mindfulnessScore),
        freedom: buildTitleLevel('freedom', freedomDefs, freedomScore)
    }
}

export function unlockedTitleCount(state: TitleState): number {
    return Math.max(0, state.mindfulness.level) + Math.max(0, state.freedom.level)
}

export function titleNameOf(state: TitleState, line: TitleLine | 'balanced'): string {
    if (line === 'mindfulness') return state.mindfulness.name
    if (line === 'freedom') return state.freedom.name
    if (state.mindfulness.level >= state.freedom.level) return state.mindfulness.name
    return state.freedom.name
}

export function detectPromotions(previous: { mindfulness: number; freedom: number }, next: TitleState): TitlePromotion[] {
    const promotions: TitlePromotion[] = []
    if (next.mindfulness.level > previous.mindfulness) {
        promotions.push({ line: 'mindfulness', from: previous.mindfulness, to: next.mindfulness.level, score: next.mindfulness.score })
    }
    if (next.freedom.level > previous.freedom) {
        promotions.push({ line: 'freedom', from: previous.freedom, to: next.freedom.level, score: next.freedom.score })
    }
    return promotions
}

export function emptyTitleState(): TitleState {
    return {
        mindfulness: buildTitleLevel('mindfulness', [{ name: '凡人', threshold: 0 }], 0),
        freedom: buildTitleLevel('freedom', [{ name: '凡人', threshold: 0 }], 0)
    }
}