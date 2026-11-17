import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from '@shared/defaultRules'
import type { Tag } from '@shared/types/models'
import { computeScore, netOfEntries } from '../scoring'

const studyTag: Tag = {
    id: 'study',
    kind: 'activity',
    name: '学习工作',
    mindfulnessWeight: 0.9,
    freedomWeight: 0.3,
    builtin: true,
    emoji: null,
    color: null,
    softColor: null,
    createdAt: '2026-11-16T00:00:00.000Z'
}

const restTag: Tag = {
    ...studyTag,
    id: 'rest',
    name: '休息放松',
    mindfulnessWeight: 0.5,
    freedomWeight: 1
}

describe('计分引擎', () => {
    it('待办配「学习工作」标签：正念 11.2，逍遥 1.6', () => {
        const score = computeScore({ source: 'todoCompleted', tag: studyTag, dayNet: { mindfulness: 0, freedom: 0 }, rules: DEFAULT_RULES })
        expect(score).toEqual({ mindfulness: 11.2, freedom: 1.6 })
    })

    it('无标签时系数为 1.0', () => {
        const score = computeScore({ source: 'todoCompleted', tag: null, dayNet: { mindfulness: 0, freedom: 0 }, rules: DEFAULT_RULES })
        expect(score).toEqual({ mindfulness: 8, freedom: 2 })
    })

    it('专注每满 10 分钟计一份', () => {
        const score = computeScore({ source: 'focusTimer', units: 3, tag: null, dayNet: { mindfulness: 0, freedom: 0 }, rules: DEFAULT_RULES })
        expect(score).toEqual({ mindfulness: 9, freedom: 3 })
    })

    it('单笔得分不超过 30', () => {
        const score = computeScore({ source: 'focusTimer', units: 100, tag: studyTag, dayNet: { mindfulness: 0, freedom: 0 }, rules: DEFAULT_RULES })
        expect(score.mindfulness).toBe(30)
        expect(score.freedom).toBe(30)
    })

    it('每日每条线封顶 80，余额不足时按余额计', () => {
        const score = computeScore({ source: 'todoCompleted', tag: null, dayNet: { mindfulness: 75, freedom: 0 }, rules: DEFAULT_RULES })
        expect(score.mindfulness).toBe(5)
        expect(score.freedom).toBe(2)
    })

    it('达到每日上限后 delta 为 0', () => {
        const score = computeScore({ source: 'habitCheckin', tag: studyTag, dayNet: { mindfulness: 80, freedom: 80 }, rules: DEFAULT_RULES })
        expect(score).toEqual({ mindfulness: 0, freedom: 0 })
    })

    it('休息放松标签提升逍遥系数', () => {
        const score = computeScore({ source: 'habitCheckin', tag: restTag, dayNet: { mindfulness: 0, freedom: 0 }, rules: DEFAULT_RULES })
        expect(score.mindfulness).toBe(5)
        expect(score.freedom).toBe(3)
    })

    it('冲正流水按负值参与净额', () => {
        const net = netOfEntries([
            {
                id: '1',
                businessDate: '2026-11-16',
                sourceType: 'todoCompleted',
                sourceId: 'i1',
                sourceVersion: 1,
                mindfulnessDelta: 11.2,
                freedomDelta: 1.6,
                ruleVersion: '1.0.0',
                reversedBy: null,
                demo: false,
                createdAt: '2026-11-16T00:00:00.000Z'
            },
            {
                id: '2',
                businessDate: '2026-11-16',
                sourceType: 'reversal',
                sourceId: '1',
                sourceVersion: 1,
                mindfulnessDelta: -11.2,
                freedomDelta: -1.6,
                ruleVersion: '1.0.0',
                reversedBy: null,
                demo: false,
                createdAt: '2026-11-16T01:00:00.000Z'
            }
        ])
        expect(net).toEqual({ mindfulness: 0, freedom: 0 })
    })
})