import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 }

export interface PassHash {
    hash: string
    salt: string
}

export function hashPassphrase(passphrase: string): PassHash {
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(passphrase, salt, KEY_LENGTH, SCRYPT_OPTIONS).toString('hex')
    return { hash, salt }
}

export function verifyPassphrase(passphrase: string, hash: string, salt: string): boolean {
    try {
        const expected = Buffer.from(hash, 'hex')
        const actual = scryptSync(passphrase, salt, KEY_LENGTH, SCRYPT_OPTIONS)
        if (expected.length !== actual.length) return false
        return timingSafeEqual(expected, actual)
    } catch {
        return false
    }
}