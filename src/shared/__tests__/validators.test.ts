import { describe, expect, it } from 'vitest'
import {
    notFutureDate,
    validateBio,
    validateConfirmClear,
    validateDayBoundary,
    validateDiaryContent,
    validateEmotionTagIds,
    validateEventTitle,
    validateIntensity,
    validateNickname,
    validateNotes,
    validatePassphrase,
    validateTargetValue
} from '../validators'

describe('纯校验函数', () => {
    it('道号 2–64 字', () => {
        expect(validateNickname('林').valid).toBe(false)
        expect(validateNickname('林间客').valid).toBe(true)
        expect(validateNickname('a'.repeat(64)).valid).toBe(true)
        expect(validateNickname('a'.repeat(65)).valid).toBe(false)
    })

    it('简介最多 200 字，可留白', () => {
        expect(validateBio('').valid).toBe(true)
        expect(validateBio('a'.repeat(200)).valid).toBe(true)
        expect(validateBio('a'.repeat(201)).valid).toBe(false)
    })

    it('事项标题必填且不超过 60 字', () => {
        expect(validateEventTitle('').valid).toBe(false)
        expect(validateEventTitle('读十页书').valid).toBe(true)
        expect(validateEventTitle('a'.repeat(61)).valid).toBe(false)
    })

    it('备注不超过 500 字', () => {
        expect(validateNotes('a'.repeat(500)).valid).toBe(true)
        expect(validateNotes('a'.repeat(501)).valid).toBe(false)
    })

    it('手记正文 1–1000 字', () => {
        expect(validateDiaryContent('   ').valid).toBe(false)
        expect(validateDiaryContent('今天很好').valid).toBe(true)
        expect(validateDiaryContent('a'.repeat(1001)).valid).toBe(false)
    })

    it('情绪标签 1–3 个', () => {
        expect(validateEmotionTagIds([]).valid).toBe(false)
        expect(validateEmotionTagIds(['a']).valid).toBe(true)
        expect(validateEmotionTagIds(['a', 'b', 'c']).valid).toBe(true)
        expect(validateEmotionTagIds(['a', 'b', 'c', 'd']).valid).toBe(false)
    })

    it('强度 1–5 的整数', () => {
        expect(validateIntensity(0).valid).toBe(false)
        expect(validateIntensity(3).valid).toBe(true)
        expect(validateIntensity(6).valid).toBe(false)
        expect(validateIntensity(2.5).valid).toBe(false)
    })

    it('口令 8–128 位', () => {
        expect(validatePassphrase('1234567').valid).toBe(false)
        expect(validatePassphrase('12345678').valid).toBe(true)
        expect(validatePassphrase('a'.repeat(129)).valid).toBe(false)
    })

    it('目标值大于 0', () => {
        expect(validateTargetValue(0).valid).toBe(false)
        expect(validateTargetValue(-1).valid).toBe(false)
        expect(validateTargetValue(3).valid).toBe(true)
    })

    it('日界线 0–23 的整数', () => {
        expect(validateDayBoundary(-1).valid).toBe(false)
        expect(validateDayBoundary(4).valid).toBe(true)
        expect(validateDayBoundary(24).valid).toBe(false)
        expect(validateDayBoundary(4.5).valid).toBe(false)
    })

    it('清除确认词必须是「清空」', () => {
        expect(validateConfirmClear('清空').valid).toBe(true)
        expect(validateConfirmClear('清除').valid).toBe(false)
    })

    it('日期不得晚于当前业务日', () => {
        expect(notFutureDate('2026-11-16', '2026-11-16').valid).toBe(true)
        expect(notFutureDate('2026-11-17', '2026-11-16').valid).toBe(false)
        expect(notFutureDate('2026/11/16', '2026-11-16').valid).toBe(false)
    })
})