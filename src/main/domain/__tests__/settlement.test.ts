import { describe, expect, it } from 'vitest'
import type { LedgerEntry, Snapshot } from '@shared/types/models'
import { buildSnapshot, pendingSettlementDates, recalculateFrom, settleDates, upsertSnapshot } from '../settlement'

function entry(id: string, date: string, mindfulnessDelta: number, freedomDelta: number, sourceType: LedgerEntry['sourceType'] = 'todoCompleted'): LedgerEntry {
    return {
        id,
        businessDate: date,
        sourceType,
        sourceId: id,
        sourceVersion: 1,
        mindfulnessDelta,
        freedomDelta,
        ruleVersion: '1.0.0',
        reversedBy: null,
        demo: false,
        createdAt: `${date}T00:00:00.000Z`
    }
}

describe('结算引擎', () => {
    it('快照总量等于上一快照加当日增量', () => {
        const previous: Snapshot = {
            businessDate: '2026-11-15',
            mindfulnessTotal: 10,
            freedomTotal: 5,
            mindfulnessDelta: 10,
            freedomDelta: 5,
            settledAt: '2026-11-15T20:00:00.000Z',
            version: 1
        }
        const snapshot = buildSnapshot('2026-11-16', [entry('a', '2026-11-16', 8, 2)], previous, '2026-11-16T21:00:00.000Z')
        expect(snapshot.mindfulnessTotal).toBe(18)
        expect(snapshot.freedomTotal).toBe(7)
        expect(snapshot.version).toBe(2)
    })

    it('补结算按日期升序累加', () => {
        const entries = [entry('a', '2026-11-16', 8, 2), entry('b', '2026-11-15', 5, 1)]
        const snapshots = settleDates(entries, [], ['2026-11-16', '2026-11-15'], '2026-11-17T00:00:00.000Z')
        const first = snapshots.find((item) => item.businessDate === '2026-11-15')
        const second = snapshots.find((item) => item.businessDate === '2026-11-16')
        expect(first?.mindfulnessTotal).toBe(5)
        expect(second?.mindfulnessTotal).toBe(13)
        expect(second?.freedomTotal).toBe(3)
    })

    it('同日重复结算覆盖快照、版本递增、总量不叠加', () => {
        const entries = [entry('a', '2026-11-16', 8, 2)]
        const once = settleDates(entries, [], ['2026-11-16'], '2026-11-16T21:00:00.000Z')
        const twice = settleDates(entries, once, ['2026-11-16'], '2026-11-16T22:00:00.000Z')
        expect(twice).toHaveLength(1)
        expect(twice[0]?.mindfulnessTotal).toBe(8)
        expect(twice[0]?.version).toBe(2)
    })

    it('未结算日期包含有流水的日期与今日，且按升序排列', () => {
        const entries = [entry('a', '2026-11-14', 1, 1), entry('b', '2026-11-15', 1, 1)]
        const pending = pendingSettlementDates(entries, [], '2026-11-16')
        expect(pending).toEqual(['2026-11-14', '2026-11-15', '2026-11-16'])
    })

    it('冲正后当日及之后的累计同额下移，更早快照不变', () => {
        const day1 = entry('a', '2026-11-15', 10, 4)
        const day2 = entry('b', '2026-11-16', 8, 2)
        const snapshots = settleDates([day1, day2], [], ['2026-11-15', '2026-11-16'], '2026-11-17T00:00:00.000Z')
        const reversal = entry('r', '2026-11-16', -8, -2, 'reversal')
        const result = recalculateFrom(snapshots, [day1, day2, reversal], '2026-11-16')
        const first = result.snapshots.find((item) => item.businessDate === '2026-11-15')
        const second = result.snapshots.find((item) => item.businessDate === '2026-11-16')
        expect(first?.mindfulnessTotal).toBe(10)
        expect(second?.mindfulnessDelta).toBe(0)
        expect(second?.mindfulnessTotal).toBe(10)
    })

    it('upsert 对同日快照做替换而非追加', () => {
        const one = buildSnapshot('2026-11-16', [], null, '2026-11-16T21:00:00.000Z')
        const two = { ...one, version: 2 }
        const list = upsertSnapshot([one], two)
        expect(list).toHaveLength(1)
        expect(list[0]?.version).toBe(2)
    })
})