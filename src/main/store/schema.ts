import type { DataDocument } from '@shared/types/models'
import { SCHEMA_VERSION } from '@shared/constants'

export interface StructureCheck {
    valid: boolean
    errors: string[]
}

const REQUIRED_ARRAYS = [
    'tags',
    'events',
    'instances',
    'activities',
    'timerSessions',
    'diaries',
    'ledgerEntries',
    'snapshots',
    'verdicts',
    'achievements',
    'userAchievements',
    'changeLogs'
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateStructure(value: unknown): StructureCheck {
    const errors: string[] = []
    if (!isRecord(value)) {
        return { valid: false, errors: ['文档根节点不是对象'] }
    }
    if (typeof value.schemaVersion !== 'number') errors.push('缺少 schemaVersion')
    if (!isRecord(value.settings)) errors.push('缺少 settings')
    if (value.profile !== null && !isRecord(value.profile)) errors.push('profile 结构不正确')
    for (const key of REQUIRED_ARRAYS) {
        if (!Array.isArray(value[key])) errors.push(`缺少集合 ${key}`)
    }
    if (!isRecord(value.rules)) errors.push('缺少 rules')
    if (!isRecord(value.meta)) errors.push('缺少 meta')
    return { valid: errors.length === 0, errors }
}

export function toDocument(value: unknown): DataDocument {
    return value as DataDocument
}

export function isSupportedVersion(value: unknown): boolean {
    if (!isRecord(value)) return false
    return typeof value.schemaVersion === 'number' && value.schemaVersion <= SCHEMA_VERSION
}