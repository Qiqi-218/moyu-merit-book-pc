import { ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { AchievementBoard, AchievementStats, AchievementUnlock } from '@shared/types/dto'
import { EVENT_CHANNELS } from '@shared/ipc'
import { computeStats, evaluateAchievements, progressLabelOf, statsFromEmpty } from '../domain/achievements'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

export function statsOf(ctx: ServiceContext): AchievementStats {
    if (!ctx.doc.profile) return statsFromEmpty()
    return computeStats({
        activities: ctx.doc.activities,
        diaries: ctx.doc.diaries,
        instances: ctx.doc.instances,
        events: ctx.doc.events,
        snapshots: ctx.doc.snapshots,
        titles: ctx.titles(),
        exportCount: ctx.doc.meta.counters.exportCount,
        timezone: ctx.doc.settings.timezone,
        boundaryHour: ctx.doc.settings.dayBoundaryHour,
        today: ctx.today()
    })
}

export function boardOf(ctx: ServiceContext): AchievementBoard {
    const stats = statsOf(ctx)
    const unlocked = ctx.doc.userAchievements
    return {
        items: ctx.doc.achievements,
        unlocked,
        titles: ctx.titles(),
        stats,
        counts: { unlocked: unlocked.length, total: ctx.doc.achievements.length }
    }
}

export function getBoard(ctx: ServiceContext): Result<AchievementBoard> {
    return ok(boardOf(ctx))
}

export function progressLabels(ctx: ServiceContext): Record<string, string> {
    const stats = statsOf(ctx)
    const result: Record<string, string> = {}
    for (const def of ctx.doc.achievements) result[def.id] = progressLabelOf(def, stats)
    return result
}

export async function evaluateAndUnlock(ctx: ServiceContext): Promise<AchievementUnlock[]> {
    if (!ctx.doc.profile) return []
    const stats = statsOf(ctx)
    const now = ctx.nowIso()
    const unlocks = evaluateAchievements(ctx.doc.achievements, stats, ctx.doc.userAchievements, now)
    if (unlocks.length === 0) return []
    try {
        await ctx.commit((draft) => {
            const known = new Set(draft.userAchievements.map((item) => item.achievementId))
            for (const unlock of unlocks) {
                if (known.has(unlock.achievementId)) continue
                draft.userAchievements.push({ achievementId: unlock.achievementId, unlockedAt: unlock.unlockedAt })
            }
        })
        ctx.broadcast('achievements')
        ctx.send(EVENT_CHANNELS.achievementUnlocked, unlocks)
        return unlocks
    } catch (error) {
        void errorToFail('achievement', error)
        return []
    }
}