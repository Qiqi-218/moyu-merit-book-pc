import type { ErrorCode } from '@shared/result'

export class StoreError extends Error {
    readonly code: ErrorCode

    constructor(code: ErrorCode, message: string) {
        super(message)
        this.name = 'StoreError'
        this.code = code
    }
}