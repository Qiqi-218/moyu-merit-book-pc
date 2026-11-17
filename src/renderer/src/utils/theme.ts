import type { Settings } from '@shared/types/models'

export function applyTheme(settings: Pick<Settings, 'theme' | 'fontSize' | 'motion'>): void {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    root.dataset.fontSize = settings.fontSize
    root.dataset.motion = settings.motion ? 'on' : 'off'
}

export function applyThemeFallback(theme: 'paper' | 'night', fontSize: 'normal' | 'large'): void {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.fontSize = fontSize
}