import { fail } from '@shared/result'
import type { ErrorCode, Fail } from '@shared/result'
import type { ValidationResult } from '@shared/validators'
import { logger } from './logger'

export { ok, fail } from '@shared/result'

export function invalid(message?: string, code: ErrorCode = 'E_VALIDATION'): Fail {
    return fail(code, message)
}

export function fromValidation(result: ValidationResult): Fail | null {
    if (result.valid) return null
    return fail('E_VALIDATION', result.message)
}

export function internalFail(module: string, error: unknown): Fail {
    const detail = error instanceof Error ? error.message : String(error)
    logger.error(module, detail)
    return fail('E_INTERNAL')
}

export function ioFail(module: string, error: unknown): Fail {
    const detail = error instanceof Error ? error.message : String(error)
    logger.error(module, `IO 失败：${detail}`)
    return fail('E_IO')
}