import type { Activity, TargetUnit } from '@shared/types/models'

export interface ProgressResult {
    value: number
    ratio: number
    overTarget: boolean
}

export function activeActivities(activities: Activity[]): Activity[] {
    return activities.filter((item) => item.revokedAt === null)
}

export function round1(value: number): number {
    return Math.round(value * 10 + 1e-9) / 10
}

export function computeProgress(targetUnit: TargetUnit, targetValue: number, activities: Activity[]): ProgressResult {
    const active = activeActivities(activities)
    let value = 0
    if (targetUnit === 'minutes') {
        const seconds = active.reduce((sum, item) => sum + Math.max(0, item.durationSeconds), 0)
        value = round1(seconds / 60)
    } else {
        value = round1(active.reduce((sum, item) => sum + Math.max(0, item.quantity), 0))
    }
    const target = targetValue > 0 ? targetValue : 1
    const ratio = Math.max(0, Math.min(1, value / target))
    return { value, ratio, overTarget: value > targetValue }
}

export function isTargetReached(value: number, targetValue: number): boolean {
    return value >= targetValue
}