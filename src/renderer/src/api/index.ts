import type { Result } from '@shared/result'
import { useUiStore } from '@/stores/ui'

export async function call<T>(promise: Promise<Result<T>>, quiet = false): Promise<T | null> {
    try {
        const result = await promise
        if (result.ok) return result.data
        if (!quiet) useUiStore().pushToast(result.error.message, result.error.hint)
        return null
    } catch {
        if (!quiet) useUiStore().pushToast('操作没有完成，请稍后重试。', '若持续出现，可打开数据目录查看日志。')
        return null
    }
}

export function moyu(): Window['moyu'] {
    return window.moyu
}