import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { JsonStore } from '../../store/jsonStore'
import { BackupManager } from '../../store/backupManager'
import { ServiceContext } from '../context'
import { resetRulesFor, rulesFilePath } from '../rulesService'

async function createContext(): Promise<ServiceContext> {
    const dir = await mkdtemp(join(tmpdir(), 'moyu-rules-'))
    const store = new JsonStore(dir, '1.0.0', () => new Date().toISOString())
    await store.load()
    return new ServiceContext(store, new BackupManager(dir), '1.0.0', 'build-time', () => { })
}

describe('rulesService.resetRulesFor', () => {
    it('篡改规则后恢复为默认值，并重写 rules.json 与变更日志', async () => {
        const ctx = await createContext()
        await ctx.commit((draft) => {
            draft.rules.scoring.perEntryCap = 50
            draft.rules.rulesVersion = '9.9.9'
        })
        expect(ctx.doc.rules.scoring.perEntryCap).toBe(50)

        const result = await resetRulesFor(ctx)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.data.rulesVersion).toBe('1.0.0')
            expect(result.data.scoring.perEntryCap).toBe(30)
        }
        expect(ctx.doc.rules.scoring.perEntryCap).toBe(30)
        expect(ctx.doc.rules.rulesVersion).toBe('1.0.0')

        const fileText = await readFile(rulesFilePath(ctx.store.dataDir), 'utf8')
        expect(fileText).toContain('"rulesVersion": "1.0.0"')

        const ruleLogs = ctx.doc.changeLogs.filter((item) => item.entityType === 'rules')
        expect(ruleLogs.length).toBeGreaterThan(0)
        expect(ruleLogs[ruleLogs.length - 1]?.before).toBe('9.9.9')
        expect(ruleLogs[ruleLogs.length - 1]?.after).toBe('1.0.0')
    })
})