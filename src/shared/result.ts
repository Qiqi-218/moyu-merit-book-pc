export type ErrorCode =
    | 'E_VALIDATION'
    | 'E_NOT_FOUND'
    | 'E_CONFLICT'
    | 'E_LOCKED'
    | 'E_LOCK_REQUIRED'
    | 'E_IO'
    | 'E_SCHEMA'
    | 'E_VERSION_TOO_NEW'
    | 'E_CORRUPT'
    | 'E_FORBIDDEN'
    | 'E_BUSY'
    | 'E_INTERNAL'

export interface AppError {
    code: ErrorCode
    message: string
    hint?: string
    retryable: boolean
    retryAfterMs?: number
    details?: string[]
}

export interface Ok<T> {
    ok: true
    data: T
}

export interface Fail {
    ok: false
    error: AppError
}

export type Result<T> = Ok<T> | Fail

export interface ErrorTemplate {
    message: string
    hint: string
    retryable: boolean
}

export const ERROR_TEMPLATES: Record<ErrorCode, ErrorTemplate> = {
    E_VALIDATION: { message: '填写的内容还差一点，请检查后再试。', hint: '请按提示修改后重试。', retryable: true },
    E_NOT_FOUND: { message: '没有找到这条记录。', hint: '它可能已被删除，返回列表刷新后再试。', retryable: false },
    E_CONFLICT: { message: '这条记录已经存在。', hint: '请刷新页面后重试。', retryable: true },
    E_LOCKED: { message: '口令校验已暂时锁定。', hint: '请稍候片刻再试。', retryable: true },
    E_LOCK_REQUIRED: { message: '需要先解锁。', hint: '请先输入口令解锁。', retryable: false },
    E_IO: { message: '本地数据未能保存。', hint: '请检查磁盘空间或数据目录权限后重试。', retryable: true },
    E_SCHEMA: { message: '本地数据格式不正确。', hint: '可尝试从备份恢复，或打开数据目录查看。', retryable: false },
    E_VERSION_TOO_NEW: { message: '该文件来自更高版本的摸鱼功德簿。', hint: '请升级应用后再导入。', retryable: false },
    E_CORRUPT: { message: '本地数据已损坏，备份也无法读取。', hint: '请打开数据目录，从 backups 中手工恢复。', retryable: false },
    E_FORBIDDEN: { message: '这个操作被拒绝了。', hint: '请确认操作方式，或重新进入页面再试。', retryable: false },
    E_BUSY: { message: '上一步还在处理中。', hint: '请稍等一秒后再试。', retryable: true },
    E_INTERNAL: { message: '遇到了一点小问题。', hint: '请重试，若持续出现可打开数据目录查看日志。', retryable: true }
}

export function ok<T>(data: T): Ok<T> {
    return { ok: true, data }
}

export function fail(code: ErrorCode, message?: string, options?: { hint?: string; retryAfterMs?: number; details?: string[] }): Fail {
    const template = ERROR_TEMPLATES[code]
    const error: AppError = {
        code,
        message: message ?? template.message,
        hint: options?.hint ?? template.hint,
        retryable: code === 'E_VALIDATION' ? true : template.retryable
    }
    if (options?.retryAfterMs !== undefined) error.retryAfterMs = options.retryAfterMs
    if (options?.details !== undefined) error.details = options.details
    return { ok: false, error }
}

export function isOk<T>(result: Result<T>): result is Ok<T> {
    return result.ok
}