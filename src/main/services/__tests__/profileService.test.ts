import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import type { CreateProfileInput } from '@shared/types/dto'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { ServiceContext } from '../context'
import { createProfile, getProfile } from '../profileService'

async function createContext(): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-profile-'))
    const store = new JsonStore(dir, '1.0.0', () => new Date().toISOString())
    await store.load()
    return new ServiceContext(store, new BackupManager(dir), '1.0.0', 'build-time', () => { })
}

const baseInput: CreateProfileInput = {
    nickname: '测试修行',
    bio: '先记下这一句',
    dayBoundaryHour: 4,
    loadDemo: false,
    avatarSeed: 1
}

describe('profileService.createProfile', () => {
    it('成功后按契约返回 Bootstrap（含 settings/profile/lockState）', async () => {
        const ctx = await createContext()
        const result = await createProfile(ctx, baseInput)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.data.profile?.nickname).toBe('测试修行')
            expect(result.data.settings.dayBoundaryHour).toBe(4)
            expect(result.data.lockRequired).toBe(false)
            expect(result.data.today.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
        const profile = getProfile(ctx)
        expect(profile.ok && profile.data?.demoDataLoaded).toBe(false)
    })

    it('不载入示例数据时，新账户没有任何历史、分数与快照', async () => {
        const ctx = await createContext()
        const result = await createProfile(ctx, baseInput)
        expect(result.ok).toBe(true)
        expect(ctx.doc.activities.length).toBe(0)
        expect(ctx.doc.instances.length).toBe(0)
        expect(ctx.doc.ledgerEntries.length).toBe(0)
        expect(ctx.doc.snapshots.length).toBe(0)
        expect(ctx.doc.verdicts.length).toBe(0)
        expect(ctx.doc.diaries.length).toBe(0)
        if (result.ok) {
            expect(result.data.today.dayTotals.mindfulnessTotal).toBe(0)
            expect(result.data.today.dayTotals.freedomTotal).toBe(0)
            expect(result.data.titles.mindfulness.level).toBe(0)
            expect(result.data.titles.freedom.level).toBe(0)
            expect(result.data.today.missing).toBe(0)
        }
    })

    it('载入示例数据后完整落盘（事项/快照/变更日志）', async () => {
        const ctx = await createContext()
        const result = await createProfile(ctx, { ...baseInput, loadDemo: true })
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.data.demoDataLoaded).toBe(true)
            expect(result.data.today.missing).toBeGreaterThan(0)
        }
        expect(ctx.doc.meta.demo.loaded).toBe(true)
        expect(ctx.doc.events.length).toBeGreaterThanOrEqual(12)
        expect(ctx.doc.snapshots.length).toBeGreaterThanOrEqual(13)
        expect(ctx.doc.changeLogs.length).toBeGreaterThan(0)
        expect(ctx.doc.changeLogs.every((item) => item.createdAt.length > 0)).toBe(true)
    })

    it('重复建档返回 E_CONFLICT 而不是异常', async () => {
        const ctx = await createContext()
        const first = await createProfile(ctx, baseInput)
        expect(first.ok).toBe(true)
        const second = await createProfile(ctx, baseInput)
        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error.code).toBe('E_CONFLICT')
    })

    it('设置口令后 lockRequired 为 true', async () => {
        const ctx = await createContext()
        const result = await createProfile(ctx, { ...baseInput, passphrase: '12345678' })
        expect(result.ok).toBe(true)
        if (result.ok) expect(result.data.lockRequired).toBe(true)
    })
})