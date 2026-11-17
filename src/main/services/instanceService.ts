import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { GenerateResult, InstanceView } from '@shared/types/dto'
import type { BusinessDate } from '@shared/types/models'
import { compareDate } from '@shared/dateUtils'
import { buildInstanceView } from '../domain/aggregates'
import { generateInstancesForDate, missingInstanceCount } from '../domain/instanceGenerator'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

export function listByDate(ctx: ServiceContext, date: BusinessDate): Result<InstanceView[]> {
    const dayWindow = ctx.dayWindow(date)
    const items = ctx.doc.instances.filter((instance) => {
        if (instance.businessDate === date) return true
        const event = ctx.event(instance.eventId)
        if (!event || event.kind !== 'habit') return false
        if (instance.status === 'shelved' || instance.status === 'skipped') return false
        return compareDate(instance.businessDate, date) < 0 && instance.windowEnd > dayWindow.start
    })
    const sorted = [...items].sort((a, b) => {
        if (a.businessDate !== b.businessDate) return compareDate(a.businessDate, b.businessDate)
        return a.createdAt < b.createdAt ? -1 : 1
    })
    return ok(sorted.map((item) => buildInstanceView(ctx.doc, item)))
}

export async function generateToday(ctx: ServiceContext): Promise<Result<GenerateResult>> {
    try {
        const today = ctx.today()
        const before = missingInstanceCount(ctx.doc.events, ctx.doc.instances, {
            businessDate: today,
            boundaryHour: ctx.doc.settings.dayBoundaryHour,
            timeZone: ctx.doc.settings.timezone,
            nowIso: ctx.nowIso(),
            idFactory: () => createId()
        })
        const created = await ctx.commit((draft) => {
            const generated = generateInstancesForDate(draft.events, draft.instances, {
                businessDate: today,
                boundaryHour: draft.settings.dayBoundaryHour,
                timeZone: draft.settings.timezone,
                nowIso: ctx.nowIso(),
                idFactory: () => createId()
            })
            draft.instances.push(...generated)
            return generated.length
        })
        ctx.broadcast('instances', today)
        return ok({ created, missing: Math.max(0, before - created) })
    } catch (error) {
        return errorToFail('instance', error)
    }
}

export async function setInstanceStatus(ctx: ServiceContext, instanceId: string, status: 'shelved' | 'skipped' | 'pending'): Promise<Result<InstanceView>> {
    if (!['shelved', 'skipped', 'pending'].includes(status)) return fail('E_VALIDATION', '状态不正确')
    const instance = ctx.instance(instanceId)
    if (!instance) return fail('E_NOT_FOUND', '没有找到这条课业')
    try {
        const next = await ctx.commit((draft) => {
            const target = draft.instances.find((item) => item.id === instanceId)
            if (!target) throw new Error('instance missing')
            target.status = status
            target.completedAt = null
            return target
        })
        ctx.broadcast('instances', next.businessDate)
        return ok(buildInstanceView(ctx.doc, next))
    } catch (error) {
        return errorToFail('instance', error)
    }
}