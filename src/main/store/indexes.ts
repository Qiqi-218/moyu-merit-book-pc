import type { DataDocument, Snapshot, Verdict } from '@shared/types/models'

export interface StoreIndexes {
    activityBySourceKey: Map<string, string>
    instanceByEventDate: Map<string, string>
    ledgerByDate: Map<string, string[]>
    diaryByDate: Map<string, string[]>
    snapshotByDate: Map<string, Snapshot>
    verdictByDate: Map<string, Verdict>
    userAchievementSet: Set<string>
    activeTimerId: string | null
}

export function buildIndexes(doc: DataDocument): StoreIndexes {
    const activityBySourceKey = new Map<string, string>()
    const instanceByEventDate = new Map<string, string>()
    const ledgerByDate = new Map<string, string[]>()
    const diaryByDate = new Map<string, string[]>()
    const snapshotByDate = new Map<string, Snapshot>()
    const verdictByDate = new Map<string, Verdict>()
    const userAchievementSet = new Set<string>()
    let activeTimerId: string | null = null

    for (const item of doc.activities) activityBySourceKey.set(item.sourceKey, item.id)
    for (const item of doc.instances) instanceByEventDate.set(`${item.eventId}|${item.businessDate}`, item.id)
    for (const item of doc.ledgerEntries) {
        const list = ledgerByDate.get(item.businessDate)
        if (list) list.push(item.id)
        else ledgerByDate.set(item.businessDate, [item.id])
    }
    for (const item of doc.diaries) {
        const list = diaryByDate.get(item.businessDate)
        if (list) list.push(item.id)
        else diaryByDate.set(item.businessDate, [item.id])
    }
    for (const item of doc.snapshots) snapshotByDate.set(item.businessDate, item)
    for (const item of doc.verdicts) verdictByDate.set(item.businessDate, item)
    for (const item of doc.userAchievements) userAchievementSet.add(item.achievementId)
    for (const item of doc.timerSessions) {
        if (item.status === 'running' || item.status === 'paused') activeTimerId = item.id
    }

    return {
        activityBySourceKey,
        instanceByEventDate,
        ledgerByDate,
        diaryByDate,
        snapshotByDate,
        verdictByDate,
        userAchievementSet,
        activeTimerId
    }
}

export function detectDangling(doc: DataDocument): string[] {
    const problems: string[] = []
    const eventIds = new Set(doc.events.map((item) => item.id))
    const instanceIds = new Set(doc.instances.map((item) => item.id))
    for (const instance of doc.instances) {
        if (!eventIds.has(instance.eventId)) problems.push(`课业 ${instance.id} 指向不存在的事项`)
    }
    for (const activity of doc.activities) {
        if (activity.instanceId && !instanceIds.has(activity.instanceId)) problems.push(`行止 ${activity.id} 指向不存在的课业`)
    }
    return problems
}