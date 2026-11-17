import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { CreateTagInput, UpdateTagInput } from '@shared/types/dto'
import type { Tag } from '@shared/types/models'
import { createId } from '../utils/id'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

function validateWeights(m: number, f: number): string | null {
    if (typeof m !== 'number' || m < 0 || m > 1) return '正念权重应在 0–1 之间'
    if (typeof f !== 'number' || f < 0 || f > 1) return '逍遥权重应在 0–1 之间'
    return null
}

export function listTags(ctx: ServiceContext): Result<Tag[]> {
    return ok(ctx.doc.tags)
}

export async function createTag(ctx: ServiceContext, input: CreateTagInput): Promise<Result<Tag>> {
    if (input.kind !== 'activity' && input.kind !== 'emotion') return fail('E_VALIDATION', '标签类型不正确')
    const name = input.name.trim()
    if (name.length === 0 || name.length > 20) return fail('E_VALIDATION', '标签名称应在 1–20 个字之间')
    const weightError = validateWeights(input.mWeight, input.fWeight)
    if (weightError) return fail('E_VALIDATION', weightError)
    if (ctx.doc.tags.some((item) => item.kind === input.kind && item.name === name)) {
        return fail('E_CONFLICT', '已有同名标签')
    }
    try {
        const now = ctx.nowIso()
        const tag: Tag = {
            id: createId(),
            kind: input.kind,
            name,
            mindfulnessWeight: input.mWeight,
            freedomWeight: input.fWeight,
            builtin: false,
            emoji: null,
            color: null,
            softColor: null,
            createdAt: now
        }
        await ctx.commit((draft) => {
            draft.tags.push(tag)
            ctx.logChange('tag', tag.id, 'create', null, name)
        })
        ctx.broadcast('settings')
        return ok(tag)
    } catch (error) {
        return errorToFail('tag', error)
    }
}

export async function updateTag(ctx: ServiceContext, input: UpdateTagInput): Promise<Result<Tag>> {
    const tag = ctx.doc.tags.find((item) => item.id === input.id)
    if (!tag) return fail('E_NOT_FOUND', '没有找到这个标签')
    if (input.name !== undefined) {
        if (tag.builtin) return fail('E_FORBIDDEN', '内置标签不可改名')
        const name = input.name.trim()
        if (name.length === 0 || name.length > 20) return fail('E_VALIDATION', '标签名称应在 1–20 个字之间')
        if (ctx.doc.tags.some((item) => item.kind === tag.kind && item.name === name && item.id !== tag.id)) {
            return fail('E_CONFLICT', '已有同名标签')
        }
    }
    if (input.mWeight !== undefined && (input.mWeight < 0 || input.mWeight > 1)) {
        return fail('E_VALIDATION', '正念权重应在 0–1 之间')
    }
    if (input.fWeight !== undefined && (input.fWeight < 0 || input.fWeight > 1)) {
        return fail('E_VALIDATION', '逍遥权重应在 0–1 之间')
    }
    try {
        const next = await ctx.commit((draft) => {
            const target = draft.tags.find((item) => item.id === input.id)
            if (!target) throw new Error('tag missing')
            if (input.name !== undefined) target.name = input.name.trim()
            if (input.mWeight !== undefined) target.mindfulnessWeight = input.mWeight
            if (input.fWeight !== undefined) target.freedomWeight = input.fWeight
            ctx.logChange('tag', target.id, 'update', null, target.name)
            return target
        })
        ctx.broadcast('settings')
        return ok(next)
    } catch (error) {
        return errorToFail('tag', error)
    }
}