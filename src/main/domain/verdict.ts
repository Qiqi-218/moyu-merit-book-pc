import type { BusinessDate, Verdict } from '@shared/types/models'
import type { Rules, VerdictTemplate, VerdictTier } from '@shared/types/rules'
import { FORBIDDEN_PHRASES } from '@shared/constants'
import { formatDateCN } from '@shared/dateUtils'
import { fnv1a32 } from '../utils/hash'

export const EMPTY_VERDICT_TEXT = '今日尚无行止，且留白一日，亦是修行。'

export function determineTier(mindfulnessDelta: number, freedomDelta: number): VerdictTier {
    if (mindfulnessDelta === 0 && freedomDelta === 0) return 'balanced'
    if (mindfulnessDelta === 0) return 'freedom'
    if (freedomDelta === 0) return 'mindfulness'
    const ratio = Math.abs(mindfulnessDelta - freedomDelta) / Math.max(mindfulnessDelta, freedomDelta)
    if (ratio <= 0.25) return 'balanced'
    return mindfulnessDelta > freedomDelta ? 'mindfulness' : 'freedom'
}

export function verdictSignature(
    businessDate: BusinessDate,
    profileId: string,
    tier: VerdictTier,
    dominantTagId: string | null,
    topEmotionTagId: string | null
): string {
    return `${businessDate}#${profileId}#${tier}#${dominantTagId ?? '-'}#${topEmotionTagId ?? '-'}`
}

export function selectTemplate(
    rules: Rules,
    businessDate: BusinessDate,
    profileId: string,
    tier: VerdictTier,
    dominantTagId: string | null,
    topEmotionTagId: string | null
): VerdictTemplate {
    const pool = rules.verdictTemplates.filter((item) => item.tier === tier)
    const list = pool.length > 0 ? pool : rules.verdictTemplates
    if (list.length === 0) {
        return {
            id: 'verdict-b3',
            tier: 'balanced',
            simple: '且记今日行止，静待判官落笔。',
            polished: '日拱一卒，功不唐捐；来日回望，皆是风景。'
        }
    }
    const signature = verdictSignature(businessDate, profileId, tier, dominantTagId, topEmotionTagId)
    const index = fnv1a32(signature) % list.length
    return list[index] as VerdictTemplate
}

export function containsForbidden(text: string): boolean {
    return FORBIDDEN_PHRASES.some((phrase) => text.includes(phrase))
}

function safeTemplate(rules: Rules, template: VerdictTemplate): VerdictTemplate {
    if (containsForbidden(template.simple) || containsForbidden(template.polished)) {
        const fallback = rules.verdictTemplates.find((item) => item.id === 'verdict-b3')
        if (fallback) return fallback
    }
    return template
}

export function verdictFooter(date: BusinessDate, titleName: string): string {
    const cn = formatDateCN(date)
    const datePart = cn.replace(/ 周./, '')
    return `—— ${datePart} · 今日修得${titleName}`
}

export interface BuildVerdictInput {
    rules: Rules
    businessDate: BusinessDate
    profileId: string
    mindfulnessDelta: number
    freedomDelta: number
    dominantTagId: string | null
    topEmotionTagId: string | null
    titleName: string
    createdAt: string
}

export function buildVerdict(input: BuildVerdictInput): Verdict {
    if (input.mindfulnessDelta === 0 && input.freedomDelta === 0) {
        return {
            businessDate: input.businessDate,
            text: EMPTY_VERDICT_TEXT,
            polishedText: EMPTY_VERDICT_TEXT,
            templateId: 'verdict-empty',
            status: 'empty',
            createdAt: input.createdAt
        }
    }
    const tier = determineTier(input.mindfulnessDelta, input.freedomDelta)
    const template = safeTemplate(
        input.rules,
        selectTemplate(input.rules, input.businessDate, input.profileId, tier, input.dominantTagId, input.topEmotionTagId)
    )
    void input.titleName
    return {
        businessDate: input.businessDate,
        text: template.simple,
        polishedText: template.polished,
        templateId: template.id,
        status: 'generated',
        createdAt: input.createdAt
    }
}