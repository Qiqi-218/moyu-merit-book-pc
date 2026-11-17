import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { EventDetail, EventInput, EventListQuery, EventListResult } from '@shared/types/dto'
import type { Event, EventKind, EventStatus, Instance } from '@shared/types/models'
import { addDays } from '@shared/dateUtils'
import { validateEventTitle, validateNotes, validateTargetValue } from '@shared/validators'
import { generateInstancesForDate } from '../domain/instanceGenerator'
import { buildInstanceView } from '../domain/aggregates'
import { computeProgress } from '../domain/progress'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

function emptyCounts(): Record<EventKind, number> {
    return { todo: 0, habit: 0, principle: 0 }
}

function emptyStatusCounts(): Record<EventStatus, number> {
    return { active: 0, paused: 0, ended: 0 }
}

function buildDetail(ctx: ServiceContext, event: Event): EventDetail {
    const tag = ctx.tag(event.tagId)
    const today = ctx.today()
    const todayInstance = ctx.doc.instances.find((item) => item.eventId === event.id && item.businessDate === today) ?? null
    const since = addDays(today, -13)
    const recentInstances = ctx.doc.instances.filter((item) => item.eventId === event.id && item.businessDate >= since && item.businessDate <= today)
    const completed = recentInstances.filter((item) => item.status === 'completed').length
    return {
        ...event,
        tagName: tag?.name ?? null,
        tagColor: tag?.color ?? null,
        todayInstance: todayInstance ? buildInstanceView(ctx.doc, todayInstance) : null,
        completionRate14: recentInstances.length > 0 ? completed / recentInstances.length : 0
    }
}

function validateInput(input: EventInput): string | null {
    if (!['todo', 'habit', 'principle'].includes(input.kind)) return '事项类型不正确'
    const titleCheck = validateEventTitle(input.title)
    if (!titleCheck.valid) return titleCheck.message ?? '标题不正确'
    const notesCheck = validateNotes(input.notes)
    if (!notesCheck.valid) return notesCheck.message ?? '备注不正确'
    const targetCheck = validateTargetValue(input.targetValue)
    if (!targetCheck.valid) return targetCheck.message ?? '目标值不正确'
    if (input.kind === 'habit' && !['daily', 'weekly', 'monthly'].includes(input.frequency)) return '习惯频率不正确'
    if (!['times', 'minutes', 'quantity'].includes(input.targetUnit)) return '目标单位不正确'
    return null
}

export function listEvents(ctx: ServiceContext, query: EventListQuery): Result<EventListResult> {
    const all = ctx.doc.events.filter((item) => item.deletedAt === null)
    const countsByKind = emptyCounts()
    const countsByStatus = emptyStatusCounts()
    for (const event of all) {
        countsByKind[event.kind] += 1
        countsByStatus[event.status] += 1
    }
    let items = all
    if (query.kind !== undefined) items = items.filter((item) => item.kind === query.kind)
    if (query.status !== undefined) items = items.filter((item) => item.status === query.status)
    if (query.tagId !== undefined) items = items.filter((item) => item.tagId === query.tagId)
    const keyword = query.keyword.trim()
    if (keyword.length > 0) items = items.filter((item) => item.title.includes(keyword) || item.notes.includes(keyword))

    if (query.sort === 'recent') {
        items = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    } else if (query.sort === 'completed') {
        items = [...items].sort((a, b) => {
            const lastA = Math.max(0, ...ctx.doc.instances.filter((i) => i.eventId === a.id && i.completedAt).map((i) => Date.parse(i.completedAt ?? '')))
            const lastB = Math.max(0, ...ctx.doc.instances.filter((i) => i.eventId === b.id && i.completedAt).map((i) => Date.parse(i.completedAt ?? '')))
            return lastB - lastA
        })
    } else {
        items = [...items].sort((a, b) => {
            const progressOf = (event: Event): number => {
                const instance = ctx.doc.instances.find((i) => i.eventId === event.id && i.businessDate === ctx.today())
                if (!instance) return 0
                const activities = ctx.doc.activities.filter((i) => i.instanceId === instance.id)
                return computeProgress(instance.targetUnit, instance.targetValue, activities).ratio
            }
            return progressOf(b) - progressOf(a)
        })
    }

    const total = items.length
    const page = Math.max(1, query.page)
    const pageSize = Math.min(200, Math.max(1, query.pageSize))
    const start = (page - 1) * pageSize
    return ok({
        items: items.slice(start, start + pageSize).map((item) => buildDetail(ctx, item)),
        total,
        countsByKind,
        countsByStatus
    })
}

export function getEvent(ctx: ServiceContext, id: string): Result<EventDetail> {
    const event = ctx.doc.events.find((item) => item.id === id && item.deletedAt === null)
    if (!event) return fail('E_NOT_FOUND', '没有找到这个事项')
    return ok(buildDetail(ctx, event))
}

export async function createEvent(ctx: ServiceContext, input: EventInput): Promise<Result<EventDetail>> {
    const validationError = validateInput(input)
    if (validationError) return fail('E_VALIDATION', validationError)
    try {
        const now = ctx.nowIso()
        const today = ctx.today()
        const created = await ctx.commit((draft) => {
            const event: Event = {
                id: createId(),
                kind: input.kind,
                title: input.title.trim(),
                notes: input.notes.trim(),
                tagId: input.tagId,
                status: 'active',
                frequency: input.frequency,
                targetValue: input.targetValue,
                targetUnit: input.targetUnit,
                createdAt: now,
                updatedAt: now,
                deletedAt: null
            }
            draft.events.push(event)
            if (event.kind !== 'principle') {
                const generated = generateInstancesForDate([event], draft.instances, {
                    businessDate: today,
                    boundaryHour: draft.settings.dayBoundaryHour,
                    timeZone: draft.settings.timezone,
                    nowIso: now,
                    idFactory: () => createId()
                })
                draft.instances.push(...generated)
            }
            ctx.logChange('event', event.id, 'create', null, event.title)
            return event
        })
        ctx.broadcast('events')
        ctx.broadcast('instances')
        return ok(buildDetail(ctx, created))
    } catch (error) {
        return errorToFail('event', error)
    }
}

export async function updateEvent(ctx: ServiceContext, id: string, input: EventInput): Promise<Result<EventDetail>> {
    const existing = ctx.doc.events.find((item) => item.id === id && item.deletedAt === null)
    if (!existing) return fail('E_NOT_FOUND', '没有找到这个事项')
    if (input.kind !== existing.kind) return fail('E_FORBIDDEN', '类型创建后不可修改')
    const validationError = validateInput(input)
    if (validationError) return fail('E_VALIDATION', validationError)
    try {
        const next = await ctx.commit((draft) => {
            const event = draft.events.find((item) => item.id === id)
            if (!event) throw new Error('event missing')
            event.title = input.title.trim()
            event.notes = input.notes.trim()
            event.tagId = input.tagId
            event.frequency = input.frequency
            event.targetValue = input.targetValue
            event.targetUnit = input.targetUnit
            event.updatedAt = ctx.nowIso()
            ctx.logChange('event', event.id, 'update', existing.title, event.title)
            return event
        })
        ctx.broadcast('events')
        return ok(buildDetail(ctx, next))
    } catch (error) {
        return errorToFail('event', error)
    }
}

export async function changeEventStatus(ctx: ServiceContext, id: string, status: EventStatus): Promise<Result<EventDetail>> {
    if (!['active', 'paused', 'ended'].includes(status)) return fail('E_VALIDATION', '状态不正确')
    const existing = ctx.doc.events.find((item) => item.id === id && item.deletedAt === null)
    if (!existing) return fail('E_NOT_FOUND', '没有找到这个事项')
    try {
        const next = await ctx.commit((draft) => {
            const event = draft.events.find((item) => item.id === id)
            if (!event) throw new Error('event missing')
            event.status = status
            event.updatedAt = ctx.nowIso()
            ctx.logChange('event', event.id, 'update', existing.status, status)
            return event
        })
        ctx.broadcast('events')
        return ok(buildDetail(ctx, next))
    } catch (error) {
        return errorToFail('event', error)
    }
}

export async function removeEvent(ctx: ServiceContext, id: string, confirm: boolean): Promise<Result<void>> {
    if (confirm !== true) return fail('E_FORBIDDEN', '请先确认删除')
    const existing = ctx.doc.events.find((item) => item.id === id && item.deletedAt === null)
    if (!existing) return fail('E_NOT_FOUND', '没有找到这个事项')
    try {
        await ctx.commit((draft) => {
            const event = draft.events.find((item) => item.id === id)
            if (!event) throw new Error('event missing')
            event.deletedAt = ctx.nowIso()
            event.status = 'ended'
            event.updatedAt = ctx.nowIso()
            ctx.logChange('event', event.id, 'delete', event.title, null)
        })
        ctx.broadcast('events')
        ctx.broadcast('instances')
        return ok(undefined)
    } catch (error) {
        return errorToFail('event', error)
    }
}

export function instanceOfEventOn(ctx: ServiceContext, eventId: string, date: string): Instance | null {
    return ctx.doc.instances.find((item) => item.eventId === eventId && item.businessDate === date) ?? null
}