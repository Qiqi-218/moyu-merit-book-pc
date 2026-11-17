import { describe, expect, it } from 'vitest'
import { businessDateOf, offsetOf, windowOf } from '../businessDay'

const TZ = 'Asia/Shanghai'

describe('业务日引擎', () => {
    it('日界线默认 4 点时，03:59 归前一天，04:00 归当日', () => {
        expect(businessDateOf('2026-11-15T19:59:00Z', 4, TZ)).toBe('2026-11-15')
        expect(businessDateOf('2026-11-15T20:00:00Z', 4, TZ)).toBe('2026-11-16')
        expect(businessDateOf('2026-11-15T20:01:00Z', 4, TZ)).toBe('2026-11-16')
    })

    it('日界线为 0 时按自然日归属', () => {
        expect(businessDateOf('2026-11-15T15:59:00Z', 0, TZ)).toBe('2026-11-15')
        expect(businessDateOf('2026-11-15T16:00:00Z', 0, TZ)).toBe('2026-11-16')
    })

    it('日界线为 23 点时，22:59 归前一日、23:00 归当日', () => {
        expect(businessDateOf('2026-11-15T14:59:00Z', 23, TZ)).toBe('2026-11-14')
        expect(businessDateOf('2026-11-15T15:00:00Z', 23, TZ)).toBe('2026-11-15')
    })

    it('上海时区偏移恒为 +8 小时', () => {
        expect(offsetOf('2026-11-15T20:30:00Z', TZ)).toBe(8 * 3600 * 1000)
    })

    it('业务窗口为左闭右开，且跨月正确', () => {
        const window = windowOf('2026-11-16', 4, TZ)
        expect(window.start).toBe('2026-11-15T20:00:00.000Z')
        expect(window.end).toBe('2026-11-16T20:00:00.000Z')

        const monthEdge = windowOf('2026-11-30', 4, TZ)
        expect(monthEdge.end).toBe('2026-11-30T20:00:00.000Z')
    })

    it('跨年与闰年边界稳定', () => {
        expect(businessDateOf('2026-12-31T21:00:00Z', 4, TZ)).toBe('2027-01-01')
        expect(businessDateOf('2028-02-28T21:00:00Z', 4, TZ)).toBe('2028-02-29')
        expect(businessDateOf('2028-02-29T21:00:00Z', 4, TZ)).toBe('2028-03-01')
    })
})