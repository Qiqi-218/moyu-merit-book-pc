import type { BusinessDate, ChangeLog, DataDocument, Event, Id, Instance, LedgerEntry, LedgerSourceType, Tag } from '@shared/types/models'
import type { TitleState, TitlePromotion } from '@shared/types/dto'
import { EVENT_CHANNELS } from '@shared/ipc'
import type { JsonStore } from '../store/jsonStore'
import type { BackupManager } from '../store/backupManager'
import type { StoreIndexes } from '../store/indexes'
import { buildIndexes } from '../store/indexes'
import { businessDateOf, windowOf } from '../domain/businessDay'
import { latestSnapshot } from '../domain/settlement'
import { netOfEntries } from '../domain/scoring'
import { buildTitleState, detectPromotions } from '../domain/titles'
import { createId } from '../utils/id'
import { logger } from '../utils/logger'
import { round1 } from '../utils/time'

export type Broadcast = (channel: string, payload: unknown) => void

export class ServiceContext {
    private cachedIndexVersion = -1
    private cachedIndexes: StoreIndexes | null = null
    unlocked = false

    constructor(
        readonly store: JsonStore,
        readonly backup: BackupManager,
        readonly appVersion: string,
        readonly buildTime: string,
        readonly emit: Broadcast,
        readonly clock: () => number = Date.now
    ) { }

    lockRequired(): boolean {
        return this.doc.profile?.passHash !== null && this.doc.profile?.passHash !== undefined
    }

    get doc(): DataDocument {
        return this.store.document
    }

    get indexes(): StoreIndexes {
        if (!this.cachedIndexes || this.cachedIndexVersion !== this.docUpdatedStamp()) {
            this.cachedIndexes = buildIndexes(this.doc)
            this.cachedIndexVersion = this.docUpdatedStamp()
        }
        return this.cachedIndexes
    }

    private docUpdatedStamp(): number {
        return Date.parse(this.doc.updatedAt)
    }

    rules(): DataDocument['rules'] {
        return this.doc.rules
    }

    nowIso(): string {
        return new Date(this.clock()).toISOString()
    }

    today(): BusinessDate {
        return businessDateOf(this.clock(), this.doc.settings.dayBoundaryHour, this.doc.settings.timezone)
    }

    profileId(): Id {
        return this.doc.profile?.id ?? 'anonymous'
    }

    tag(id: Id | null): Tag | null {
        if (!id) return null
        return this.doc.tags.find((item) => item.id === id) ?? null
    }

    event(id: Id): Event | null {
        return this.doc.events.find((item) => item.id === id) ?? null
    }

    instance(id: Id): Instance | null {
        return this.doc.instances.find((item) => item.id === id) ?? null
    }

    dayWindow(date: BusinessDate): { start: string; end: string } {
        return windowOf(date, this.doc.settings.dayBoundaryHour, this.doc.settings.timezone)
    }

    dayLedger(date: BusinessDate): LedgerEntry[] {
        return this.doc.ledgerEntries.filter((item) => item.businessDate === date)
    }

    dayNet(date: BusinessDate): { mindfulness: number; freedom: number } {
        return netOfEntries(this.dayLedger(date))
    }

    titles(): TitleState {
        const latest = latestSnapshot(this.doc.snapshots)
        return buildTitleState(
            this.doc.rules.titles.mindfulness,
            this.doc.rules.titles.freedom,
            latest?.mindfulnessTotal ?? 0,
            latest?.freedomTotal ?? 0
        )
    }

    totals(): { mindfulness: number; freedom: number } {
        const latest = latestSnapshot(this.doc.snapshots)
        return { mindfulness: latest?.mindfulnessTotal ?? 0, freedom: latest?.freedomTotal ?? 0 }
    }

    private pendingChangeLogs: ChangeLog[] = []

    async commit<T>(mutator: (draft: DataDocument) => T | Promise<T>): Promise<T> {
        const result = await this.store.commit(async (draft) => {
            try {
                const outcome = await mutator(draft)
                if (this.pendingChangeLogs.length > 0) {
                    draft.changeLogs.push(...this.pendingChangeLogs)
                    if (draft.changeLogs.length > 2000) draft.changeLogs = draft.changeLogs.slice(-2000)
                    this.pendingChangeLogs = []
                }
                return outcome
            } catch (error) {
                this.pendingChangeLogs = []
                throw error
            }
        })
        this.cachedIndexes = null
        return result
    }

    broadcast(scope: 'instances' | 'activities' | 'diary' | 'settings' | 'profile' | 'events' | 'achievements' | 'settlement', businessDate?: BusinessDate, ids?: Id[]): void {
        this.emit(EVENT_CHANNELS.dataChanged, { scope, businessDate, ids })
    }

    send(channel: string, payload: unknown): void {
        this.emit(channel, payload)
    }

    makeLedger(
        date: BusinessDate,
        sourceType: LedgerSourceType,
        sourceId: Id,
        score: { mindfulness: number; freedom: number },
        sourceVersion = 1
    ): LedgerEntry {
        return {
            id: createId(),
            businessDate: date,
            sourceType,
            sourceId,
            sourceVersion,
            mindfulnessDelta: round1(score.mindfulness),
            freedomDelta: round1(score.freedom),
            ruleVersion: this.doc.rules.rulesVersion,
            reversedBy: null,
            demo: false,
            createdAt: this.nowIso()
        }
    }

    logChange(entityType: string, entityId: Id, action: 'create' | 'update' | 'delete' | 'revoke' | 'settle' | 'import' | 'clear', before: string | null, after: string | null): void {
        this.pendingChangeLogs.push({
            id: createId(),
            entityType,
            entityId,
            action,
            before,
            after,
            createdAt: this.nowIso()
        })
        if (this.pendingChangeLogs.length > 200) {
            this.pendingChangeLogs.splice(0, this.pendingChangeLogs.length - 200)
        }
    }

    pendingPromotions(): TitlePromotion[] {
        const titles = this.titles()
        const previous = this.doc.meta.lastPromotedTitle
        const promotions = detectPromotions(previous, titles)
        if (promotions.length > 0) {
            this.doc.meta.lastPromotedTitle = { mindfulness: titles.mindfulness.level, freedom: titles.freedom.level }
            for (const promotion of promotions) {
                logger.info('titles', `境界提升：${promotion.line} ${promotion.from} -> ${promotion.to}`)
            }
        }
        return promotions
    }

    touch(): void {
        this.doc.updatedAt = this.nowIso()
    }
}