import { mkdirSync, readFileSync, writeFileSync } from 'fs'

const source = readFileSync(new URL('../src/shared/defaultRules.ts', import.meta.url), 'utf8')
const anchor = source.indexOf('DEFAULT_RULES')
const start = source.indexOf('{', anchor)
const end = source.lastIndexOf('}')
if (anchor < 0 || start < 0 || end < 0) {
    throw new Error('无法定位默认规则对象')
}
const literal = source.slice(start, end + 1)
const rules = eval(`(${literal})`)

mkdirSync(new URL('../resources/rules/', import.meta.url), { recursive: true })
writeFileSync(new URL('../resources/rules/default-rules.json', import.meta.url), JSON.stringify(rules, null, 2), 'utf8')
console.log(`默认规则已生成：${rules.rulesVersion}，判词 ${rules.verdictTemplates.length} 条，成就 ${rules.achievements.length} 条`)