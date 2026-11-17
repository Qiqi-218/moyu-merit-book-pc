import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { AtomicWriter } from '../atomicWriter'

describe('原子写入器', () => {
    it('先写 .tmp 再 rename，正常终态无 .tmp 残留', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'moyu-store-'))
        const file = join(dir, 'moyu.json')
        const writer = new AtomicWriter(file)
        try {
            await writer.write('{"schemaVersion":1}')
            expect(await readFile(file, 'utf8')).toBe('{"schemaVersion":1}')
            await expect(stat(writer.tmpPath)).rejects.toThrow()
        } finally {
            await rm(dir, { recursive: true, force: true })
        }
    })

    it('第二次写入保留上一版 .bak 副本', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'moyu-store-'))
        const file = join(dir, 'moyu.json')
        const writer = new AtomicWriter(file)
        try {
            await writer.write('first')
            await writer.write('second')
            expect(await readFile(file, 'utf8')).toBe('second')
            expect(await readFile(writer.bakPath, 'utf8')).toBe('first')
        } finally {
            await rm(dir, { recursive: true, force: true })
        }
    })
})