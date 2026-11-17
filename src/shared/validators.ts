import type { BusinessDate, ISODate } from './types/models'

export interface ValidationResult {
    valid: boolean
    code?: string
    message?: string
}

const OK: ValidationResult = { valid: true }

function bad(message: string, code = 'invalid'): ValidationResult {
    return { valid: false, code, message }
}

export function validateNickname(value: unknown): ValidationResult {
    if (typeof value !== 'string') return bad('道号需要是文字')
    const trimmed = value.trim()
    if (trimmed.length < 2) return bad('道号至少 2 个字')
    if (trimmed.length > 64) return bad('道号最多 64 个字')
    return OK
}

export function validateBio(value: unknown): ValidationResult {
    if (value === undefined || value === null) return OK
    if (typeof value !== 'string') return bad('简介需要是文字')
    if (value.length > 200) return bad('简介最多 200 个字')
    return OK
}

export function validateEventTitle(value: unknown): ValidationResult {
    if (typeof value !== 'string') return bad('请填写事项名称')
    const trimmed = value.trim()
    if (trimmed.length === 0) return bad('请填写事项名称')
    if (trimmed.length > 60) return bad('事项名称最多 60 个字')
    return OK
}

export function validateNotes(value: unknown): ValidationResult {
    if (value === undefined || value === null) return OK
    if (typeof value !== 'string') return bad('备注需要是文字')
    if (value.length > 500) return bad('备注最多 500 个字')
    return OK
}

export function validateDiaryContent(value: unknown): ValidationResult {
    if (typeof value !== 'string') return bad('请写下手记内容')
    const trimmed = value.trim()
    if (trimmed.length === 0) return bad('手记内容不能为空')
    if (value.length > 1000) return bad('手记最多 1000 个字')
    return OK
}

export function validateEmotionTagIds(value: unknown): ValidationResult {
    if (!Array.isArray(value)) return bad('请选择 1–3 个情绪')
    if (value.length < 1) return bad('请至少选择 1 个情绪')
    if (value.length > 3) return bad('最多选择 3 个情绪')
    if (!value.every((item) => typeof item === 'string')) return bad('情绪标签格式不正确')
    return OK
}

export function validateIntensity(value: unknown): ValidationResult {
    if (typeof value !== 'number' || !Number.isInteger(value)) return bad('强度需要是 1–5 的整数')
    if (value < 1 || value > 5) return bad('强度范围为 1–5')
    return OK
}

export function validatePassphrase(value: unknown): ValidationResult {
    if (typeof value !== 'string') return bad('口令需要是文字')
    if (value.length < 8) return bad('口令至少 8 位')
    if (value.length > 128) return bad('口令最多 128 位')
    return OK
}

export function validateTargetValue(value: unknown): ValidationResult {
    if (typeof value !== 'number' || Number.isNaN(value)) return bad('目标值需要是数字')
    if (value <= 0) return bad('目标值需要大于 0')
    if (value > 100000) return bad('目标值过大')
    return OK
}

export function validateDayBoundary(value: unknown): ValidationResult {
    if (typeof value !== 'number' || !Number.isInteger(value)) return bad('日界线需要是整数')
    if (value < 0 || value > 23) return bad('日界线范围为 0–23')
    return OK
}

export function validateConfirmClear(value: unknown): ValidationResult {
    if (value !== '清空') return bad('请输入「清空」以确认')
    return OK
}

export function isBusinessDate(value: unknown): value is BusinessDate {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isIsoDate(value: unknown): value is ISODate {
    if (typeof value !== 'string') return false
    const time = Date.parse(value)
    return !Number.isNaN(time)
}

export function isUuid(value: unknown): boolean {
    return typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
}

export function isDigits(value: unknown, max = 9): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 10 ** max
}

export function notFutureDate(value: unknown, today: BusinessDate): ValidationResult {
    if (!isBusinessDate(value)) return bad('日期格式应为 YYYY-MM-DD')
    if (value > today) return bad('日期不得晚于今天')
    return OK
}

export function clampText(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value
}