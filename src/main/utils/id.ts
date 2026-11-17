import { randomBytes } from 'crypto'

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function encodeTime(time: number, length: number): string {
    let value = time
    let out = ''
    for (let i = 0; i < length; i += 1) {
        out = ENCODING[value % 32] + out
        value = Math.floor(value / 32)
    }
    return out
}

function encodeRandom(length: number): string {
    const bytes = randomBytes(length)
    let out = ''
    for (let i = 0; i < length; i += 1) {
        const byte = bytes[i] ?? 0
        out += ENCODING[byte % 32]
    }
    return out
}

export function createId(prefix = ''): string {
    const time = encodeTime(Date.now(), 10)
    const random = encodeRandom(16)
    return `${prefix}${time}${random}`
}

export function createDemoId(suffix: string): string {
    const clean = suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
    return `demo_${clean}${encodeRandom(4)}`
}

export function shortId(id: string): string {
    return id.slice(-8)
}