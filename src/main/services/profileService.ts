import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { Bootstrap, CreateProfileInput, LockState, SetPassphraseInput, UnlockResult, UpdateProfileInput } from '@shared/types/dto'
import type { Profile } from '@shared/types/models'
import { validateBio, validateDayBoundary, validateNickname, validatePassphrase, validateConfirmClear } from '@shared/validators'
import { hashPassphrase, verifyPassphrase as verifyPassHash } from '../utils/password'
import { createId } from '../utils/id'
import { applyDemoData } from '../domain/seedDemo'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'
import { buildBootstrap } from './bootstrapBuilder'

const LOCK_AFTER_ATTEMPTS = 5
const LOCK_DURATION_MS = 30000

export function getProfile(ctx: ServiceContext): Result<Profile | null> {
    return ok(ctx.doc.profile)
}

export async function createProfile(ctx: ServiceContext, input: CreateProfileInput): Promise<Result<Bootstrap>> {
    if (ctx.doc.profile) return fail('E_CONFLICT', '已经入道，无需重复建档')
    const nicknameCheck = validateNickname(input.nickname)
    if (!nicknameCheck.valid) return fail('E_VALIDATION', nicknameCheck.message)
    const bioCheck = validateBio(input.bio)
    if (!bioCheck.valid) return fail('E_VALIDATION', bioCheck.message)
    const boundaryCheck = validateDayBoundary(input.dayBoundaryHour)
    if (!boundaryCheck.valid) return fail('E_VALIDATION', boundaryCheck.message)
    if (input.passphrase !== undefined && input.passphrase !== '') {
        const passCheck = validatePassphrase(input.passphrase)
        if (!passCheck.valid) return fail('E_VALIDATION', passCheck.message)
    }
    try {
        const now = ctx.nowIso()
        const today = ctx.today()
        const nickname = input.nickname.trim()
        const bio = input.bio.trim()
        const passHash = input.passphrase ? hashPassphrase(input.passphrase) : null
        await ctx.commit((draft) => {
            draft.profile = {
                id: createId(),
                nickname,
                bio,
                avatarSeed: input.avatarSeed,
                passHash: passHash?.hash ?? null,
                passSalt: passHash?.salt ?? null,
                demoDataLoaded: input.loadDemo,
                createdAt: now,
                updatedAt: now
            }
            draft.settings.dayBoundaryHour = input.dayBoundaryHour
            draft.changeLogs.push({
                id: createId(),
                entityType: 'profile',
                entityId: draft.profile.id,
                action: 'create',
                before: null,
                after: nickname,
                createdAt: now
            })
            if (input.loadDemo) applyDemoData(draft, today, now)
        })
        ctx.unlocked = true
        ctx.broadcast('profile')
        return ok(buildBootstrap(ctx))
    } catch (error) {
        return errorToFail('profile', error)
    }
}

export async function updateProfile(ctx: ServiceContext, patch: UpdateProfileInput): Promise<Result<Profile>> {
    const profile = ctx.doc.profile
    if (!profile) return fail('E_NOT_FOUND', '还没有建立档案')
    if (patch.nickname !== undefined) {
        const check = validateNickname(patch.nickname)
        if (!check.valid) return fail('E_VALIDATION', check.message)
    }
    if (patch.bio !== undefined) {
        const check = validateBio(patch.bio)
        if (!check.valid) return fail('E_VALIDATION', check.message)
    }
    if (patch.avatarSeed !== undefined && ![1, 2, 3].includes(patch.avatarSeed)) {
        return fail('E_VALIDATION', '头像样式不正确')
    }
    try {
        const next = await ctx.commit((draft) => {
            if (!draft.profile) throw new Error('profile missing')
            if (patch.nickname !== undefined) draft.profile.nickname = patch.nickname.trim()
            if (patch.bio !== undefined) draft.profile.bio = patch.bio.trim()
            if (patch.avatarSeed !== undefined) draft.profile.avatarSeed = patch.avatarSeed
            draft.profile.updatedAt = ctx.nowIso()
            ctx.logChange('profile', draft.profile.id, 'update', null, draft.profile.nickname)
            return draft.profile
        })
        ctx.broadcast('profile')
        return ok(next)
    } catch (error) {
        return errorToFail('profile', error)
    }
}

function retryAfterOf(ctx: ServiceContext): number {
    const lockedUntil = ctx.doc.meta.security.lockedUntil
    if (!lockedUntil) return 0
    return Math.max(0, Date.parse(lockedUntil) - ctx.clock())
}

export async function setPassphrase(ctx: ServiceContext, input: SetPassphraseInput): Promise<Result<void>> {
    const profile = ctx.doc.profile
    if (!profile) return fail('E_NOT_FOUND', '还没有建立档案')
    const next = input.newPassphrase
    const check = validatePassphrase(next)
    if (!check.valid) return fail('E_VALIDATION', check.message)
    if (profile.passHash && profile.passSalt) {
        if (!input.oldPassphrase) return fail('E_VALIDATION', '请输入当前口令')
        if (!verifyPassHash(input.oldPassphrase, profile.passHash, profile.passSalt)) {
            return fail('E_VALIDATION', '当前口令不对')
        }
    }
    try {
        const hashed = hashPassphrase(next)
        await ctx.commit((draft) => {
            if (!draft.profile) throw new Error('profile missing')
            draft.profile.passHash = hashed.hash
            draft.profile.passSalt = hashed.salt
            draft.profile.updatedAt = ctx.nowIso()
            draft.meta.security.failedAttempts = 0
            draft.meta.security.lockedUntil = null
            ctx.logChange('profile', draft.profile.id, 'update', null, '更新门禁')
        })
        ctx.unlocked = true
        ctx.broadcast('profile')
        return ok(undefined)
    } catch (error) {
        return errorToFail('profile', error)
    }
}

export async function verifyPassphrase(ctx: ServiceContext, passphrase: string): Promise<Result<UnlockResult>> {
    const profile = ctx.doc.profile
    if (!profile) return fail('E_NOT_FOUND', '还没有建立档案')
    if (!profile.passHash || !profile.passSalt) {
        ctx.unlocked = true
        return ok({ unlocked: true, retryAfterMs: 0 })
    }
    const retryAfterMs = retryAfterOf(ctx)
    if (retryAfterMs > 0) {
        return fail('E_LOCKED', '已连续多次输错，请稍候再试', { retryAfterMs })
    }
    if (!passphrase) return fail('E_VALIDATION', '请输入口令')
    const matched = verifyPassHash(passphrase, profile.passHash, profile.passSalt)
    if (matched) {
        try {
            await ctx.commit((draft) => {
                draft.meta.security.failedAttempts = 0
                draft.meta.security.lockedUntil = null
            })
        } catch (error) {
            return errorToFail('profile', error)
        }
        ctx.unlocked = true
        return ok({ unlocked: true, retryAfterMs: 0 })
    }
    const attempts = ctx.doc.meta.security.failedAttempts + 1
    const willLock = attempts >= LOCK_AFTER_ATTEMPTS
    try {
        await ctx.commit((draft) => {
            draft.meta.security.failedAttempts = attempts
            draft.meta.security.lockedUntil = willLock ? new Date(ctx.clock() + LOCK_DURATION_MS).toISOString() : null
        })
    } catch (error) {
        return errorToFail('profile', error)
    }
    if (willLock) {
        return fail('E_LOCKED', '已连续 5 次输错，请稍候 30 秒', { retryAfterMs: LOCK_DURATION_MS })
    }
    return fail('E_VALIDATION', '口令不对，再试一次')
}

export async function clearPassphrase(ctx: ServiceContext, passphrase: string, confirmText: string): Promise<Result<void>> {
    const profile = ctx.doc.profile
    if (!profile) return fail('E_NOT_FOUND', '还没有建立档案')
    const confirmCheck = validateConfirmClear(confirmText)
    if (!confirmCheck.valid) return fail('E_FORBIDDEN', confirmCheck.message)
    if (profile.passHash && profile.passSalt) {
        if (!passphrase) return fail('E_VALIDATION', '请输入当前口令')
        if (!verifyPassHash(passphrase, profile.passHash, profile.passSalt)) {
            return fail('E_VALIDATION', '当前口令不对')
        }
    }
    try {
        await ctx.commit((draft) => {
            if (!draft.profile) throw new Error('profile missing')
            draft.profile.passHash = null
            draft.profile.passSalt = null
            draft.profile.updatedAt = ctx.nowIso()
            draft.meta.security.failedAttempts = 0
            draft.meta.security.lockedUntil = null
            ctx.logChange('profile', draft.profile.id, 'update', '有门禁', '清除门禁')
        })
        ctx.unlocked = true
        ctx.broadcast('profile')
        return ok(undefined)
    } catch (error) {
        return errorToFail('profile', error)
    }
}

export function lockState(ctx: ServiceContext): Result<LockState> {
    const required = ctx.lockRequired()
    return ok({
        required,
        failedAttempts: ctx.doc.meta.security.failedAttempts,
        lockedUntil: ctx.doc.meta.security.lockedUntil,
        retryAfterMs: retryAfterOf(ctx)
    })
}