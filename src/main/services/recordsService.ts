import { fail, ok } from '@shared/result'
import type { Result } from '@shared/result'
import type {
    ArchiveDailyResult,
    ArchivePeriodQuery,
    ArchivePeriodResult,
    DailyDetail,
    HistoryQuery,
    HistoryResult,
    RecordsOverview,
    SearchResult,
    TrendQuery,
    TrendResult
} from '@shared/types/dto'
import type { BusinessDate } from '@shared/types/models'
import { daysBetween, isDateString } from '@shared/dateUtils'
import {
    archiveDailyOf,
    archivePeriodOf,
    dailyDetailOf,
    historyOf,
    overviewOf,
    searchOf,
    trendOf
} from '../domain/aggregates'
import type { ServiceContext } from './context'
import { settleMissing } from './settlementService'

export function overview(ctx: ServiceContext, businessDate: BusinessDate): Result<RecordsOverview> {
    if (!isDateString(businessDate)) return fail('E_VALIDATION', '日期格式不正确')
    return ok(overviewOf(ctx.doc, businessDate))
}

export function trend(ctx: ServiceContext, query: TrendQuery): Result<TrendResult> {
    if (!isDateString(query.rangeStart) || !isDateString(query.rangeEnd)) return fail('E_VALIDATION', '日期格式不正确')
    if (!['focus', 'rest', 'emotion', 'values'].includes(query.kind)) return fail('E_VALIDATION', '趋势类型不正确')
    if (daysBetween(query.rangeStart, query.rangeEnd) < 0) return fail('E_VALIDATION', '结束日期不能早于开始日期')
    if (daysBetween(query.rangeStart, query.rangeEnd) > 366) return fail('E_VALIDATION', '区间最长 366 天')
    return ok(trendOf(ctx.doc, query))
}

export function archiveDaily(ctx: ServiceContext, page: number, pageSize: number): Result<ArchiveDailyResult> {
    if (page < 1 || pageSize < 1) return fail('E_VALIDATION', '分页参数不正确')
    return ok(archiveDailyOf(ctx.doc, page, Math.min(100, pageSize)))
}

export async function archivePeriod(ctx: ServiceContext, query: ArchivePeriodQuery): Promise<Result<ArchivePeriodResult>> {
    if (query.period !== 'weekly' && query.period !== 'monthly') return fail('E_VALIDATION', '周期类型不正确')
    await settleMissing(ctx)
    return ok(archivePeriodOf(ctx.doc, query.period, query.page, Math.min(100, query.pageSize)))
}

export function history(ctx: ServiceContext, query: HistoryQuery): Result<HistoryResult> {
    const page = Math.max(1, query.page)
    const pageSize = Math.min(100, Math.max(1, query.pageSize))
    return ok(historyOf(ctx.doc, query.sortBy, query.sortDir, page, pageSize))
}

export function dailyDetail(ctx: ServiceContext, businessDate: BusinessDate): Result<DailyDetail> {
    if (!isDateString(businessDate)) return fail('E_VALIDATION', '日期格式不正确')
    return ok(dailyDetailOf(ctx.doc, businessDate))
}

export function search(ctx: ServiceContext, keyword: string): Result<SearchResult> {
    return ok(searchOf(ctx.doc, keyword.slice(0, 60)))
}