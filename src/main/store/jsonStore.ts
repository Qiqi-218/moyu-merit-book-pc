import { mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { DataDocument } from '@shared/types/models'
import { AtomicWriter } from './atomicWriter'
import { SerialQueue } from './writeQueue'
import { StoreError } from './errors'
import { createEmptyDocument } from './defaults'
import { validateStructure, toDocument } from './schema'

export class JsonStore {
    private doc: DataDocument | null = null
    private readonly queue = new SerialQueue()
    private readonly writer: AtomicWriter
    private readonly dataDirectory: string

    constructor(
        baseDir: string,
        private readonly appVersion: string,
        private readonly clock: () => string
    ) {
        this.dataDirectory = join(baseDir, 'data')
        this.writer = new AtomicWriter(join(this.dataDirectory, 'moyu.json'))
    }

    get dataDir(): string {
        return this.dataDirectory
    }

    get filePath(): string {
        return this.writer.path
    }

    get document(): DataDocument {
        if (!this.doc) throw new StoreError('E_IO', '数据尚未加载')
        return this.doc
    }

    private async readDocument(path: string): Promise<DataDocument> {
        const text = await readFile(path, 'utf8')
        let parsed: unknown
        try {
            parsed = JSON.parse(text)
        } catch {
            throw new StoreError('E_SCHEMA', '数据文件不是合法 JSON')
        }
        const check = validateStructure(parsed)
        if (!check.valid) throw new StoreError('E_SCHEMA', check.errors.join('；'))
        return toDocument(parsed)
    }

    async load(): Promise<DataDocument> {
        await mkdir(this.dataDirectory, { recursive: true })
        let loaded: DataDocument | null = null
        let mainCorrupt = false
        try {
            loaded = await this.readDocument(this.writer.path)
        } catch (error) {
            const err = error as NodeJS.ErrnoException
            if (err.code === 'ENOENT') {
                mainCorrupt = false
            } else {
                mainCorrupt = true
            }
        }
        if (!loaded) {
            try {
                loaded = await this.readDocument(this.writer.bakPath)
            } catch {
                loaded = null
            }
        }
        if (!loaded) {
            if (mainCorrupt) {
                loaded = createEmptyDocument(this.appVersion, this.clock())
                await this.writer.write(JSON.stringify(loaded))
                this.doc = loaded
                throw new StoreError('E_CORRUPT', '本地数据损坏且备份不可用，已重建空文档')
            }
            loaded = createEmptyDocument(this.appVersion, this.clock())
            await this.writer.write(JSON.stringify(loaded))
        }
        this.doc = loaded
        return loaded
    }

    async commit<T>(mutator: (draft: DataDocument) => T | Promise<T>): Promise<T> {
        return this.queue.run(async () => {
            if (!this.doc) throw new StoreError('E_IO', '数据尚未加载')
            const draft = structuredClone(this.doc)
            const result = await mutator(draft)
            draft.updatedAt = this.clock()
            try {
                await this.writer.write(JSON.stringify(draft))
            } catch (error) {
                const err = error as NodeJS.ErrnoException
                throw new StoreError('E_IO', `写入失败：${err.code ?? 'unknown'}`)
            }
            this.doc = draft
            return result
        })
    }

    async replace(next: DataDocument): Promise<void> {
        await this.queue.run(async () => {
            next.updatedAt = this.clock()
            try {
                await this.writer.write(JSON.stringify(next))
            } catch (error) {
                const err = error as NodeJS.ErrnoException
                throw new StoreError('E_IO', `写入失败：${err.code ?? 'unknown'}`)
            }
            this.doc = next
        })
    }
}