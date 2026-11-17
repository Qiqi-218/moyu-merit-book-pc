import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = 'src/renderer'
const ALLOWED = new Set(['tokens.css', 'themes.css'])
const problems = []

function walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        const info = statSync(path)
        if (info.isDirectory()) walk(path)
        else if (/\.(vue|css)$/.test(name)) inspect(path)
    }
}

function inspect(path) {
    if ([...ALLOWED].some((allowed) => path.endsWith(allowed))) return
    const text = readFileSync(path, 'utf8')
    const styleBlocks = /<style/.test(text) ? [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n') : text
    const inlineStyles = [...text.matchAll(/style="[^"]*"/g)].map((match) => match[0]).join('\n')
    const scan = `${styleBlocks}\n${inlineStyles}`
    const hexes = scan.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    for (const hex of hexes) problems.push(`${path}: 出现裸色值 ${hex}`)
}

walk(ROOT)
if (problems.length > 0) {
    console.error('色值检查未通过：')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
}
console.log('色值检查通过：页面与组件未出现裸色值（tokens/themes 除外）')