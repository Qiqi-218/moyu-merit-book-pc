import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let logDirectory = ''

export function initLogger(directory: string): void {
    logDirectory = directory
    try {
        mkdirSync(directory, { recursive: true })
    } catch {
        logDirectory = ''
    }
}

function currentFile(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return join(logDirectory, `app-${y}${m}${d}.log`)
}

function write(level: LogLevel, module: string, message: string): void {
    if (!logDirectory) return
    const line = `${new Date().toISOString()} [${level.toUpperCase()}] [${module}] ${message}\n`
    try {
        appendFileSync(currentFile(), line, 'utf8')
    } catch {
        /* 日志写入失败不影响主流程 */
    }
}

export const logger = {
    debug(module: string, message: string): void {
        write('debug', module, message)
    },
    info(module: string, message: string): void {
        write('info', module, message)
    },
    warn(module: string, message: string): void {
        write('warn', module, message)
    },
    error(module: string, message: string): void {
        write('error', module, message)
    }
}