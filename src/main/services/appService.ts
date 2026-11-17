import { shell, app } from 'electron'
import { ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { ServiceContext } from './context'

export { buildBootstrap, versionInfo } from './bootstrapBuilder'

export async function openDataDir(ctx: ServiceContext): Promise<Result<void>> {
    const error = await shell.openPath(ctx.store.dataDir)
    if (error) return { ok: false, error: { code: 'E_IO', message: '系统无法打开数据目录', hint: error, retryable: true } }
    return ok(undefined)
}

export async function openRulesFile(ctx: ServiceContext): Promise<Result<void>> {
    const path = `${ctx.store.dataDir}/rules.json`
    const error = await shell.openPath(path)
    if (error) return { ok: false, error: { code: 'E_IO', message: '系统无法打开规则文件', hint: error, retryable: true } }
    return ok(undefined)
}

export function quitApp(): void {
    app.quit()
}