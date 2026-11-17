import { ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { Bootstrap, LockState, VersionInfo } from '@shared/types/dto'
import { compareDate } from '@shared/dateUtils'
import { buildDayTotals } from '../domain/aggregates'
import { missingInstanceCount } from '../domain/instanceGenerator'
import { pendingSettlementDates } from '../domain/settlement'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { listByDate } from './instanceService'

export function versionInfo(ctx: ServiceContext): VersionInfo {
    return {
        appVersion: ctx.appVersion,
        buildTime: ctx.buildTime,
        electron: process.versions.electron ?? '',
        chrome: process.versions.chrome ?? '',
        node: process.versions.node ?? ''
    }
}

function lockStateOf(ctx: ServiceContext): LockState {
    const security = ctx.doc.meta.security
    const retryAfterMs = security.lockedUntil ? Math.max(0, Date.parse(security.lockedUntil) - ctx.clock()) : 0
    return {
        required: ctx.lockRequired(),
        failedAttempts: security.failedAttempts,
        lockedUntil: security.lockedUntil,
        retryAfterMs
    }
}

export function buildBootstrap(ctx: ServiceContext): Bootstrap {
    const today = ctx.today()
    const instancesResult = listByDate(ctx, today)
    const instances = instancesResult.ok ? instancesResult.data : []
    const missing = missingInstanceCount(ctx.doc.events, ctx.doc.instances, {
        businessDate: today,
        boundaryHour: ctx.doc.settings.dayBoundaryHour,
        timeZone: ctx.doc.settings.timezone,
        nowIso: ctx.nowIso(),
        idFactory: () => createId()
    })
    const pending = pendingSettlementDates(ctx.doc.ledgerEntries, ctx.doc.snapshots, today).filter((date) => compareDate(date, today) < 0)
    return {
        profile: ctx.doc.profile,
        settings: ctx.doc.settings,
        titles: ctx.titles(),
        lockRequired: ctx.lockRequired(),
        lockState: lockStateOf(ctx),
        today: {
            businessDate: today,
            instances,
            dayTotals: buildDayTotals(ctx.doc, today),
            missing
        },
        demoDataLoaded: ctx.doc.profile?.demoDataLoaded ?? false,
        settlePending: pending.length > 0,
        version: versionInfo(ctx)
    }
}

export function bootstrapOf(ctx: ServiceContext): Result<Bootstrap> {
    return ok(buildBootstrap(ctx))
}