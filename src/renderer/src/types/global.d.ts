import type { MoyuApi } from '@shared/ipc'

declare global {
    interface Window {
        moyu: MoyuApi
    }
}


export { }