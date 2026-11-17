import { dialog, app, shell } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type { ClearDemoResult, ExportFileResult, FileOpResult } from '@shared/types/dto'
import type { BusinessDate, DataDocument } from '@shared/types/models'
import { SCHEMA_VERSION } from '@shared/constants'
import { compareDate, addDays } from '@shared/dateUtils'
import { validateConfirmClear } from '@shared/validators'
import { migrate } from '../store/migrator'
import { validateStructure, toDocument } from '../store/schema'
import { emptyDemoMeta, createEmptyDocument } from '../store/defaults'
import { recalculateFrom } from '../domain/settlement'
import { logger } from '../utils/logger'
import type { ServiceContext } from './context'
import { evaluateAndUnlock } from './achievementService'

function sanitized(doc: DataDocument): DataDocument {
    const copy = structuredClone(doc)
    if (copy.profile) {
        copy.profile.passHash = null
        copy.profile.passSalt = null
    }
    return copy
}

function dateStamp(): string {
    const now = new Date()
    const pad = (value: number): string => String(value).padStart(2, '0')
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
}

export async function exportJson(ctx: ServiceContext): Promise<Result<FileOpResult>> {
    try {
        const result = await dialog.showSaveDialog({
            title: '导出卷宗',
            defaultPath: join(app.getPath('documents'), `摸鱼功德簿-卷宗-${dateStamp()}.json`),
            filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePath) return ok({ canceled: true, path: null })
        await writeFile(result.filePath, JSON.stringify(sanitized(ctx.doc), null, 2), 'utf8')
        await ctx.commit((draft) => {
            draft.meta.counters.exportCount += 1
            ctx.logChange('backup', 'export', 'create', null, result.filePath ?? '')
        })
        await evaluateAndUnlock(ctx)
        return ok({ canceled: false, path: result.filePath })
    } catch (error) {
        logger.error('backup', `导出失败：${error instanceof Error ? error.message : String(error)}`)
        return fail('E_IO', '导出失败，请检查目标目录是否可写')
    }
}

export async function createBackup(ctx: ServiceContext): Promise<Result<ExportFileResult>> {
    try {
        const result = await dialog.showSaveDialog({
            title: '完整备份',
            defaultPath: join(app.getPath('documents'), `摸鱼功德簿-备份-${dateStamp()}.json`),
            filters: [{ name: 'JSON', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePath) return ok({ canceled: true, path: '' })
        await writeFile(result.filePath, JSON.stringify(ctx.doc, null, 2), 'utf8')
        return ok({ canceled: false, path: result.filePath })
    } catch (error) {
        logger.error('backup', `备份失败：${error instanceof Error ? error.message : String(error)}`)
        return fail('E_IO', '备份失败，请检查目标目录是否可写')
    }
}

async function readImportFile(): Promise<Result<DataDocument | null>> {
    const picked = await dialog.showOpenDialog({
        title: '选择备份文件',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (picked.canceled || picked.filePaths.length === 0) return ok(null)
    const path = picked.filePaths[0]
    if (!path) return ok(null)
    try {
        const text = await readFile(path, 'utf8')
        if (text.length > 200 * 1024 * 1024) return fail('E_VALIDATION', '文件过大，无法导入')
        const parsed: unknown = JSON.parse(text)
        const check = validateStructure(parsed)
        if (!check.valid) return fail('E_SCHEMA', `备份结构不正确：${check.errors.join('；')}`)
        const doc = toDocument(parsed)
        if (doc.schemaVersion > SCHEMA_VERSION) return fail('E_VERSION_TOO_NEW', undefined)
        const migrated = migrate(doc)
        return ok(migrated)
    } catch {
        return fail('E_SCHEMA', '备份文件无法读取或不是合法 JSON')
    }
}

async function importDocument(ctx: ServiceContext, action: 'restore' | 'import-json'): Promise<Result<FileOpResult>> {
    const picked = await readImportFile()
    if (!picked.ok) return picked
    if (picked.data === null) return ok({ canceled: true, path: null })
    const next = picked.data
    await ctx.backup.snapshot(ctx.doc, 'preimport')
    try {
        await ctx.store.replace(next)
        ctx.logChange('backup', action, 'import', null, '导入备份后重算')
        await evaluateAndUnlock(ctx)
        ctx.broadcast('settlement')
        ctx.broadcast('profile')
        return ok({ canceled: false, path: null })
    } catch (error) {
        logger.error('backup', `导入失败：${error instanceof Error ? error.message : String(error)}`)
        ctx.send('moyu:event:error', { code: 'E_IO', message: '导入写入失败，原有数据未改变', retryable: true })
        return fail('E_IO', '导入写入失败，原有数据未改变')
    }
}

export async function restoreBackup(ctx: ServiceContext): Promise<Result<FileOpResult>> {
    return importDocument(ctx, 'restore')
}

export async function importJson(ctx: ServiceContext): Promise<Result<FileOpResult>> {
    return importDocument(ctx, 'import-json')
}

export async function clearDemo(ctx: ServiceContext, confirm: boolean): Promise<Result<ClearDemoResult>> {
    if (confirm !== true) return fail('E_FORBIDDEN', '请先确认清除示例数据')
    const demo = ctx.doc.meta.demo
    if (!demo.loaded) return ok({ removed: 0, recalculatedDates: [] })
    try {
        const removed = await ctx.commit((draft) => {
            const dates = new Set<BusinessDate>(demo.snapshotDates)
            for (const entry of draft.ledgerEntries.filter((item) => item.demo || demo.ledgerIds.includes(item.id))) dates.add(entry.businessDate)
            const earliest = [...dates].sort(compareDate)[0] ?? ctx.today()
            draft.events = draft.events.filter((item) => !demo.eventIds.includes(item.id))
            draft.instances = draft.instances.filter((item) => !demo.instanceIds.includes(item.id))
            draft.activities = draft.activities.filter((item) => !demo.activityIds.includes(item.id) && !item.demo)
            draft.diaries = draft.diaries.filter((item) => !demo.diaryIds.includes(item.id) && !item.demo)
            draft.ledgerEntries = draft.ledgerEntries.filter((item) => !demo.ledgerIds.includes(item.id) && !item.demo)
            draft.timerSessions = draft.timerSessions.filter((item) => !demo.timerIds.includes(item.id) && !item.demo)
            draft.snapshots = draft.snapshots.filter((item) => !dates.has(item.businessDate))
            draft.verdicts = draft.verdicts.filter((item) => !dates.has(item.businessDate))
            const recalculated = recalculateFrom(draft.snapshots, draft.ledgerEntries, earliest)
            draft.snapshots = recalculated.snapshots
            draft.meta.demo = emptyDemoMeta()
            if (draft.profile) draft.profile.demoDataLoaded = false
            ctx.logChange('backup', 'clear-demo', 'clear', null, `清除示例 ${demo.eventIds.length} 个事项`)
            return { removed: demo.eventIds.length + demo.activityIds.length + demo.diaryIds.length, dates: recalculated.affectedDates }
        })
        ctx.broadcast('settlement')
        ctx.broadcast('events')
        ctx.broadcast('diary')
        return ok({ removed: removed.removed, recalculatedDates: removed.dates })
    } catch (error) {
        logger.error('backup', `清除示例失败：${error instanceof Error ? error.message : String(error)}`)
        return fail('E_IO')
    }
}

export async function clearAll(ctx: ServiceContext, confirmText: string): Promise<Result<void>> {
    const check = validateConfirmClear(confirmText)
    if (!check.valid) return fail('E_FORBIDDEN', check.message)
    try {
        const next = createEmptyDocument(ctx.appVersion, ctx.nowIso())
        await ctx.backup.snapshot(ctx.doc, 'preimport')
        await ctx.store.replace(next)
        ctx.unlocked = true
        ctx.broadcast('profile')
        ctx.broadcast('settlement')
        return ok(undefined)
    } catch (error) {
        logger.error('backup', `清除数据失败：${error instanceof Error ? error.message : String(error)}`)
        return fail('E_IO')
    }
}

export async function openPath(target: string): Promise<Result<void>> {
    const error = await shell.openPath(target)
    if (error) return fail('E_IO', '系统无法打开该路径')
    return ok(undefined)
}

export function earliestDemoDate(doc: DataDocument): BusinessDate {
    let earliest = ''
    for (const date of doc.meta.demo.snapshotDates) {
        if (!earliest || compareDate(date, earliest) < 0) earliest = date
    }
    return earliest || addDays(doc.updatedAt.slice(0, 10), 0)
}