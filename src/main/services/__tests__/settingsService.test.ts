import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { ServiceContext } from '../context'
import { patchSettings } from '../settingsService'

async function createContext(): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-settings-'))
    const store = new JsonStore(dir, '1.0.0', () => new Date().toISOString())
    await store.load()
    return new ServiceContext(store, new BackupManager(dir), '1.0.0', 'build-time', () => undefined)
}

describe('settingsService.patchSettings', () => {
    it('新账户的教学标记默认为未查看', async () => {
        const ctx = await createContext()
        expect(ctx.doc.settings.guidanceSeen).toBe(false)
    })

    it('查看教学后可持久化为已查看', async () => {
        const ctx = await createContext()
        const result = await patchSettings(ctx, { guidanceSeen: true })
        expect(result.ok).toBe(true)
        if (result.ok) expect(result.data.guidanceSeen).toBe(true)
        expect(ctx.doc.settings.guidanceSeen).toBe(true)
    })
})