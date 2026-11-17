import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const FORBIDDEN = ['坚持就是胜利', '你太懒了', '失败', '逾期', '惩罚', '连续中断', '加油']
const problems = []

function scanFile(path) {
    if (/__tests__|\.test\.|\.spec\./.test(path)) return
    const text = readFileSync(path, 'utf8')
    for (const phrase of FORBIDDEN) {
        if (text.includes(phrase)) problems.push(`${path}: 出现禁用措辞「${phrase}」`)
    }
}

function walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        const info = statSync(path)
        if (info.isDirectory()) walk(path)
        else if (/\.(vue|ts)$/.test(name)) scanFile(path)
    }
}

walk('src/renderer')
scanFile('src/shared/result.ts')

if (problems.length > 0) {
    console.error('文案检查未通过：')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
}
console.log('文案检查通过：界面与错误文案未出现压迫性措辞')