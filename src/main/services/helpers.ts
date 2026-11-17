import { fail } from '@shared/result'
import type { ErrorCode, Fail } from '@shared/result'
import { StoreError } from '../store/errors'
import { logger } from '../utils/logger'

export function errorToFail(module: string, error: unknown): Fail {
    if (error instanceof StoreError) {
        return fail(error.code, error.message)
    }
    const detail = error instanceof Error ? error.message : String(error)
    logger.error(module, detail)
    return fail('E_INTERNAL')
}

export function guard(condition: boolean, code: ErrorCode, message: string): Fail | null {
    return condition ? null : fail(code, message)
}