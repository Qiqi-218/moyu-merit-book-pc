import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const problems = []
const allowedHosts = ['localhost', '127.0.0.1', 'w3.org']

function walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        const info = statSync(path)
        if (info.isDirectory()) walk(path)
        else if (/\.(ts|vue|html|css)$/.test(name)) inspect(path)
    }
}

function inspect(path) {
    if (/__tests__|\.test\.|\.spec\./.test(path)) return
    const text = readFileSync(path, 'utf8')
    for (const match of text.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
        const url = match[0]
        if (url.includes('*')) continue
        if (!allowedHosts.some((host) => url.includes(host))) problems.push(`${path}: 发现外部地址 ${url}`)
    }
    if (/\bfetch\s*\(/.test(text)) problems.push(`${path}: 发现 fetch 调用`)
    if (/XMLHttpRequest/.test(text)) problems.push(`${path}: 发现 XMLHttpRequest`)
    if (/\belectron-updater\b/.test(text)) problems.push(`${path}: 发现自动更新依赖`)
}

walk('src')
if (problems.length > 0) {
    console.error('零网络检查未通过：')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
}
console.log('零网络检查通过：源码未引用外部地址、fetch、XHR 或自动更新')