import { Menu } from 'electron'

export function hideApplicationMenu(): void {
    Menu.setApplicationMenu(null)
}