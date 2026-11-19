import { defineStore } from 'pinia'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
    id: number
    message: string
    hint: string
    kind: ToastKind
}

let sequence = 0

export const useUiStore = defineStore('ui', {
    state: () => ({
        toasts: [] as ToastItem[],
        commandOpen: false,
        guideOpen: false,
        errorBanner: ''
    }),
    actions: {
        pushToast(message: string, hint = '', kind: ToastKind = 'info'): void {
            sequence += 1
            const id = sequence
            this.toasts.push({ id, message, hint, kind })
            if (this.toasts.length > 3) this.toasts.shift()
            window.setTimeout(() => {
                this.toasts = this.toasts.filter((item) => item.id !== id)
            }, 2400)
        },
        dismiss(id: number): void {
            this.toasts = this.toasts.filter((item) => item.id !== id)
        },
        openCommand(): void {
            this.commandOpen = true
        },
        closeCommand(): void {
            this.commandOpen = false
        },
        openGuide(): void {
            this.guideOpen = true
        },
        closeGuide(): void {
            this.guideOpen = false
        },
        setError(message: string): void {
            this.errorBanner = message
        },
        clearError(): void {
            this.errorBanner = ''
        }
    }
})