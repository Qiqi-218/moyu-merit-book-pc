import { copyFile, open, rename, unlink, access } from 'fs/promises'
import { constants } from 'fs'

async function exists(path: string): Promise<boolean> {
    try {
        await access(path, constants.F_OK)
        return true
    } catch {
        return false
    }
}

export class AtomicWriter {
    constructor(private readonly filePath: string) { }

    get path(): string {
        return this.filePath
    }

    get tmpPath(): string {
        return `${this.filePath}.tmp`
    }

    get bakPath(): string {
        return `${this.filePath}.bak`
    }

    async write(content: string): Promise<void> {
        const tmp = this.tmpPath
        try {
            if (await exists(this.filePath)) {
                await copyFile(this.filePath, this.bakPath)
            }
            const handle = await open(tmp, 'w')
            try {
                await handle.writeFile(content, 'utf8')
                await handle.sync()
            } finally {
                await handle.close()
            }
            await rename(tmp, this.filePath)
        } catch (error) {
            try {
                if (await exists(tmp)) await unlink(tmp)
            } catch {
                /* 清理失败不覆盖原始错误 */
            }
            throw error
        }
    }
}