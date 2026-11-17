import { mkdirSync, writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

const PAPER = [244, 240, 230]
const GREEN = [79, 122, 98]

function crcTable() {
    const table = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
        let c = n
        for (let k = 0; k < 8; k += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        }
        table[n] = c >>> 0
    }
    return table
}

const TABLE = crcTable()

function crc32(buffer) {
    let crc = 0xffffffff
    for (const byte of buffer) {
        crc = TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const typeBuffer = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
    return Buffer.concat([length, typeBuffer, data, crc])
}

function pixel(x, y, size) {
    const margin = Math.round(size * 0.12)
    const border = Math.max(1, Math.round(size * 0.07))
    const inSquare = x >= margin && x < size - margin && y >= margin && y < size - margin
    if (inSquare && (x < margin + border || x >= size - margin - border || y < margin + border || y >= size - margin - border)) {
        return [...GREEN, 255]
    }
    const thick = Math.max(0.8, size * 0.022)
    if (x >= size * 0.34 && x <= size * 0.66) {
        for (const ratio of [0.3, 0.425, 0.55, 0.675]) {
            if (Math.abs(y - size * ratio) <= thick) return [...GREEN, 255]
        }
    }
    if (Math.abs(x - size * 0.5) <= thick && y >= size * 0.28 && y <= size * 0.7) {
        return [...GREEN, 190]
    }
    return [...PAPER, 255]
}

function makePng(size) {
    const stride = size * 4 + 1
    const raw = Buffer.alloc(stride * size)
    for (let y = 0; y < size; y += 1) {
        raw[y * stride] = 0
        for (let x = 0; x < size; x += 1) {
            const [r, g, b, a] = pixel(x, y, size)
            const offset = y * stride + 1 + x * 4
            raw[offset] = r
            raw[offset + 1] = g
            raw[offset + 2] = b
            raw[offset + 3] = a
        }
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(size, 0)
    ihdr.writeUInt32BE(size, 4)
    ihdr[8] = 8
    ihdr[9] = 6
    ihdr[10] = 0
    ihdr[11] = 0
    ihdr[12] = 0
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0))
    ])
}

function makeIco(size) {
    const png = makePng(size)
    const header = Buffer.alloc(6)
    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(1, 4)
    const entry = Buffer.alloc(16)
    entry[0] = 0
    entry[1] = 0
    entry[2] = 0
    entry[3] = 0
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(22, 12)
    return Buffer.concat([header, entry, png])
}

mkdirSync(new URL('../build/', import.meta.url), { recursive: true })
mkdirSync(new URL('../resources/icon/', import.meta.url), { recursive: true })

writeFileSync(new URL('../build/icon.png', import.meta.url), makePng(256))
writeFileSync(new URL('../build/icon.ico', import.meta.url), makeIco(256))
writeFileSync(new URL('../resources/icon/tray-32.png', import.meta.url), makePng(32))
writeFileSync(new URL('../resources/icon/tray-16.png', import.meta.url), makePng(16))
console.log('图标已生成：build/icon.png、build/icon.ico、resources/icon/tray-16/32.png')