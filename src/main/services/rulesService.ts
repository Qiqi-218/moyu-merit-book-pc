import { access, copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { ok } from '@shared/result'
import type { Result } from '@shared/result'
import { DEFAULT_RULES } from '@shared/defaultRules'
import type { Rules } from '@shared/types/rules'
import { logger } from '../utils/logger'
import type { ServiceContext } from './context'
import { errorToFail } from './helpers'

export function rulesFilePath(dataDir: string): string {
    return join(dataDir, 'rules.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateRules(value: unknown): value is Rules {
    if (!isRecord(value)) return false
    if (typeof value.rulesVersion !== 'string') return false
    if (!isRecord(value.scoring)) return false
    if (!isRecord(value.titles)) return false
    if (!Array.isArray(value.achievements) || value.achievements.length < 12) return false
    if (!Array.isArray(value.verdictTemplates) || value.verdictTemplates.length < 9) return false
    if (!isRecord(value.tagCoefficient)) return false
    return true
}

export async function ensureRulesFile(dataDir: string, resourcePath: string): Promise<void> {
    try {
        await mkdir(dataDir, { recursive: true })
        const target = rulesFilePath(dataDir)
        try {
            await access(target)
            return
        } catch {
            /* 目标不存在，继续复制 */
        }
        try {
            await copyFile(resourcePath, target)
        } catch {
            await writeFile(target, JSON.stringify(DEFAULT_RULES, null, 2), 'utf8')
        }
    } catch (error) {
        logger.warn('rules', `初始化规则文件失败：${error instanceof Error ? error.message : String(error)}`)
    }
}

async function readRules(path: string): Promise<Rules | null> {
    try {
        const text = await readFile(path, 'utf8')
        const parsed: unknown = JSON.parse(text)
        if (!validateRules(parsed)) return null
        return parsed
    } catch {
        return null
    }
}

export async function loadRules(dataDir: string, resourcePath: string): Promise<{ rules: Rules; degraded: boolean }> {
    const local = await readRules(rulesFilePath(dataDir))
    if (local) return { rules: local, degraded: false }
    const resource = await readRules(resourcePath)
    if (resource) {
        logger.warn('rules', '本地规则不可用，已使用内置默认规则')
        return { rules: resource, degraded: true }
    }
    logger.warn('rules', '规则文件异常，已使用内置默认规则')
    return { rules: structuredClone(DEFAULT_RULES), degraded: true }
}

export async function resetRules(dataDir: string): Promise<Rules> {
    const rules = structuredClone(DEFAULT_RULES)
    await writeFile(rulesFilePath(dataDir), JSON.stringify(rules, null, 2), 'utf8')
    return rules
}
export async function resetRulesFor(ctx: ServiceContext): Promise<Result<Rules>> {
    try {
        const rules = await resetRules(ctx.store.dataDir)
        await ctx.commit((draft) => {
            const previous = draft.rules.rulesVersion
            draft.rules = rules
            ctx.logChange('rules', 'default', 'update', previous, rules.rulesVersion)
        })
        ctx.broadcast('settings')
        return ok(rules)
    } catch (error) {
        return errorToFail('rules', error)
    }
}