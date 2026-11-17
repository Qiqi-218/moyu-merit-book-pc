import { mkdir, readdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import type { DataDocument } from '@shared/types/models'
import { logger } from '../utils/logger'

export type BackupTrigger = 'startup' | 'daily' | 'preimport' | 'manual'

function stamp(date: Date): string {
    const pad = (value: number): string => String(value).padStart(2, '0')
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-${String(date.getMilliseconds()).padStart(3, '0')}`
}

export class BackupManager {
    constructor(
        private readonly baseDir: string,
        private readonly keep = 30
    ) { }

    get dir(): string {
        return join(this.baseDir, 'backups')
    }

    async snapshot(doc: DataDocument, trigger: BackupTrigger, date: Date = new Date()): Promise<string | null> {
        try {
            await mkdir(this.dir, { recursive: true })
            const name = `moyu-${stamp(date)}-${trigger}.json`
            const path = join(this.dir, name)
            await writeFile(path, JSON.stringify(doc), 'utf8')
            await this.prune()
            return path
        } catch (error) {
            logger.warn('backup', `快照失败：${error instanceof Error ? error.message : String(error)}`)
            return null
        }
    }

    async list(): Promise<string[]> {
        try {
            const names = await readdir(this.dir)
            return names.filter((name) => name.endsWith('.json')).sort()
        } catch {
            return []
        }
    }

    async prune(): Promise<void> {
        try {
            const names = await this.list()
            if (names.length <= this.keep) return
            const remove = names.slice(0, names.length - this.keep)
            for (const name of remove) {
                try {
                    await unlink(join(this.dir, name))
                } catch {
                    logger.warn('backup', `清理旧备份失败：${name}`)
                }
            }
        } catch {
            /* 备份清理失败不阻断主流程 */
        }
    }
}