import type { BusinessDate, LedgerEntry, Snapshot } from '@shared/types/models'
import { compareDate } from '@shared/dateUtils'
import { netOfEntries, round1 } from './scoring'

export function entriesOfDate(entries: LedgerEntry[], date: BusinessDate): LedgerEntry[] {
    return entries.filter((entry) => entry.businessDate === date)
}

export function latestSnapshotBefore(snapshots: Snapshot[], date: BusinessDate): Snapshot | null {
    let found: Snapshot | null = null
    for (const snapshot of snapshots) {
        if (compareDate(snapshot.businessDate, date) < 0) {
            if (!found || compareDate(snapshot.businessDate, found.businessDate) > 0) found = snapshot
        }
    }
    return found
}

export function buildSnapshot(date: BusinessDate, entries: LedgerEntry[], previous: Snapshot | null, settledAt: string): Snapshot {
    const net = netOfEntries(entries)
    const baseM = previous?.mindfulnessTotal ?? 0
    const baseF = previous?.freedomTotal ?? 0
    return {
        businessDate: date,
        mindfulnessDelta: round1(net.mindfulness),
        freedomDelta: round1(net.freedom),
        mindfulnessTotal: round1(baseM + net.mindfulness),
        freedomTotal: round1(baseF + net.freedom),
        settledAt,
        version: (previous?.version ?? 0) + 1
    }
}

export function upsertSnapshot(snapshots: Snapshot[], next: Snapshot): Snapshot[] {
    const exists = snapshots.some((item) => item.businessDate === next.businessDate)
    if (exists) {
        return snapshots.map((item) => (item.businessDate === next.businessDate ? next : item))
    }
    return [...snapshots, next]
}

export function pendingSettlementDates(entries: LedgerEntry[], snapshots: Snapshot[], today: BusinessDate): BusinessDate[] {
    const settled = new Set(snapshots.map((item) => item.businessDate))
    const dates = new Set<BusinessDate>()
    for (const entry of entries) dates.add(entry.businessDate)
    dates.add(today)
    return [...dates].filter((date) => !settled.has(date)).sort(compareDate)
}

export function settleDates(entries: LedgerEntry[], snapshots: Snapshot[], dates: BusinessDate[], nowIso: string): Snapshot[] {
    let working = [...snapshots]
    const sorted = [...dates].sort(compareDate)
    for (const date of sorted) {
        const previous = latestSnapshotBefore(working, date)
        const existing = working.find((item) => item.businessDate === date)
        const snapshot = buildSnapshot(date, entriesOfDate(entries, date), previous, nowIso)
        if (existing) snapshot.version = existing.version + 1
        working = upsertSnapshot(working, snapshot)
    }
    return working
}

export interface RecalculateResult {
    snapshots: Snapshot[]
    affectedDates: BusinessDate[]
}

export function recalculateFrom(snapshots: Snapshot[], entries: LedgerEntry[], fromDate: BusinessDate): RecalculateResult {
    const affected = [...snapshots]
        .filter((item) => compareDate(item.businessDate, fromDate) >= 0)
        .sort((a, b) => compareDate(a.businessDate, b.businessDate))
    if (affected.length === 0) return { snapshots: [...snapshots], affectedDates: [] }

    let previousTotalM = 0
    let previousTotalF = 0
    let previousVersion = 0
    const anchor = latestSnapshotBefore(snapshots, fromDate)
    if (anchor) {
        previousTotalM = anchor.mindfulnessTotal
        previousTotalF = anchor.freedomTotal
    }

    const updateMap = new Map<BusinessDate, Snapshot>()
    const affectedDates: BusinessDate[] = []

    for (const item of affected) {
        const net = netOfEntries(entriesOfDate(entries, item.businessDate))
        const totalM = round1(previousTotalM + net.mindfulness)
        const totalF = round1(previousTotalF + net.freedom)
        const next: Snapshot = {
            ...item,
            mindfulnessDelta: round1(net.mindfulness),
            freedomDelta: round1(net.freedom),
            mindfulnessTotal: totalM,
            freedomTotal: totalF,
            version: item.version + 1
        }
        updateMap.set(item.businessDate, next)
        affectedDates.push(item.businessDate)
        previousTotalM = totalM
        previousTotalF = totalF
        previousVersion = next.version
    }
    void previousVersion

    return {
        snapshots: snapshots.map((item) => updateMap.get(item.businessDate) ?? item),
        affectedDates
    }
}

export function latestSnapshot(snapshots: Snapshot[]): Snapshot | null {
    let latest: Snapshot | null = null
    for (const snapshot of snapshots) {
        if (!latest || compareDate(snapshot.businessDate, latest.businessDate) > 0) latest = snapshot
    }
    return latest
}