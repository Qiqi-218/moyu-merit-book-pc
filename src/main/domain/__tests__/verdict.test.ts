import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from '@shared/defaultRules'
import { buildVerdict, containsForbidden, determineTier, EMPTY_VERDICT_TEXT, selectTemplate, verdictFooter } from '../verdict'

describe('判词引擎', () => {
    it('按双值增量划分三档', () => {
        expect(determineTier(0, 0)).toBe('balanced')
        expect(determineTier(0, 10)).toBe('freedom')
        expect(determineTier(10, 0)).toBe('mindfulness')
        expect(determineTier(10, 9)).toBe('balanced')
        expect(determineTier(10, 2)).toBe('mindfulness')
        expect(determineTier(2, 10)).toBe('freedom')
    })

    it('同一业务日多次选择得到同一模板', () => {
        const first = selectTemplate(DEFAULT_RULES, '2026-11-16', 'profile-1', 'mindfulness', 'study', 'emotion-calm')
        const second = selectTemplate(DEFAULT_RULES, '2026-11-16', 'profile-1', 'mindfulness', 'study', 'emotion-calm')
        expect(first.id).toBe(second.id)
    })

    it('无记录时输出固定留白判词', () => {
        const verdict = buildVerdict({
            rules: DEFAULT_RULES,
            businessDate: '2026-11-16',
            profileId: 'p1',
            mindfulnessDelta: 0,
            freedomDelta: 0,
            dominantTagId: null,
            topEmotionTagId: null,
            titleName: '凡人',
            createdAt: '2026-11-16T21:00:00.000Z'
        })
        expect(verdict.status).toBe('empty')
        expect(verdict.text).toBe(EMPTY_VERDICT_TEXT)
        expect(verdict.templateId).toBe('verdict-empty')
    })

    it('9 条模板都不含禁用措辞', () => {
        for (const template of DEFAULT_RULES.verdictTemplates) {
            expect(containsForbidden(template.simple)).toBe(false)
            expect(containsForbidden(template.polished)).toBe(false)
        }
    })

    it('落款格式为指定样式', () => {
        expect(verdictFooter('2026-11-16', '清心入定')).toBe('—— 2026年11月16日 · 今日修得清心入定')
    })

    it('有了增量时生成简版与润色版', () => {
        const verdict = buildVerdict({
            rules: DEFAULT_RULES,
            businessDate: '2026-11-16',
            profileId: 'p1',
            mindfulnessDelta: 12,
            freedomDelta: 2,
            dominantTagId: 'study',
            topEmotionTagId: null,
            titleName: '凡人',
            createdAt: '2026-11-16T21:00:00.000Z'
        })
        expect(verdict.status).toBe('generated')
        expect(verdict.text.length).toBeGreaterThan(0)
        expect(verdict.polishedText.length).toBeGreaterThan(0)
        expect(verdict.text).not.toBe(verdict.polishedText)
    })
})