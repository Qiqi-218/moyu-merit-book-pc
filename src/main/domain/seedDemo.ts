import type {
    Activity,
    BusinessDate,
    DataDocument,
    Diary,
    Event,
    Instance,
    LedgerEntry,
    Tag,
    TimerSession
} from '@shared/types/models'
import { addDays, parseDateParts } from '@shared/dateUtils'
import { windowOf } from './businessDay'
import { computeProgress } from './progress'
import { computeScore } from './scoring'
import { buildVerdict } from './verdict'
import { buildTitleState } from './titles'
import { settleDates } from './settlement'
import { round1 } from './scoring'
import { createId } from '../utils/id'

interface DemoEventTemplate {
    key: string
    kind: Event['kind']
    title: string
    tagId: string
    frequency: Event['frequency']
    targetValue: number
    targetUnit: Event['targetUnit']
}

const TEMPLATES: DemoEventTemplate[] = [
    { key: 'read', kind: 'todo', title: '读十页书', tagId: 'study', frequency: 'once', targetValue: 1, targetUnit: 'times' },
    { key: 'stretch', kind: 'todo', title: '拉伸十分钟', tagId: 'health', frequency: 'once', targetValue: 10, targetUnit: 'minutes' },
    { key: 'desk', kind: 'todo', title: '整理书桌', tagId: 'health', frequency: 'once', targetValue: 1, targetUnit: 'times' },
    { key: 'call', kind: 'todo', title: '给家人打个电话', tagId: 'social', frequency: 'once', targetValue: 1, targetUnit: 'times' },
    { key: 'essay', kind: 'todo', title: '写一段随笔', tagId: 'creative', frequency: 'once', targetValue: 1, targetUnit: 'times' },
    { key: 'water', kind: 'habit', title: '喝够三杯水', tagId: 'health', frequency: 'daily', targetValue: 3, targetUnit: 'times' },
    { key: 'walk', kind: 'habit', title: '散步二十分钟', tagId: 'sport', frequency: 'daily', targetValue: 1, targetUnit: 'times' },
    { key: 'focus', kind: 'habit', title: '专注半小时', tagId: 'study', frequency: 'daily', targetValue: 30, targetUnit: 'minutes' },
    { key: 'sleep', kind: 'habit', title: '十一点前休息', tagId: 'rest', frequency: 'daily', targetValue: 1, targetUnit: 'times' },
    { key: 'game', kind: 'habit', title: '游戏半小时', tagId: 'entertainment', frequency: 'daily', targetValue: 1, targetUnit: 'times' },
    { key: 'music', kind: 'habit', title: '听一张专辑', tagId: 'creative', frequency: 'weekly', targetValue: 1, targetUnit: 'times' },
    { key: 'gentle', kind: 'principle', title: '对自己温和一点', tagId: 'rest', frequency: 'once', targetValue: 1, targetUnit: 'times' }
]

const DIARY_TEXTS = [
    '今天把待办清单上的第一件事做完了，虽然只花了二十分钟，但心里松了一点。窗外的光落在桌角，像是在说慢一点也没关系。',
    '午后有点困，泡了一杯茶，听着水汽的声音发了会儿呆。没有完成计划里的全部内容，不过把重要的那件做了，也算对得起这一天。希望明天能早一点睡。',
    '和朋友聊了很久，说起各自最近的小烦恼。原来大家都在笨拙地往前走。挂掉电话之后，觉得夜风都变得温柔了一些。',
    '专注了半小时，期间没有去看手机。结束的时候有一种很安静的满足感。原来把注意力放回一件事上，本身就是一种休息。',
    '今天情绪起伏有点大，早上还很有干劲，下午忽然有些低落。写下这些的时候，感觉它们被放在了纸上，不再全部压在胸口。明天给自己安排一点散步的时间。',
    '地铁上看见一位老人抱着一束花，忽然觉得很温暖。生活的褶皱里，总有一些细小的亮光。',
    '有点累，什么也不想做。给自己煮了面，加了两个蛋。吃完之后觉得还可以再撑一撑，但也允许自己今晚早点收工。',
    '完成了一次很长的专注，四十五分钟。中间想放弃两次，都忍住了。不是每次都能这样，但今天可以给自己记上一笔。',
    '晚上出去走了走，风有点凉。路边的树影摇摇晃晃，心里那些拧成一团的事情，好像也松开了一点。',
    '这一周过得很快。回头看，做成的事情不算多，但也没有停下。明天想把书桌整理一下，给新的星期留一点清爽。'
]

const EMOTION_IDS = ['emotion-happy', 'emotion-calm', 'emotion-anxious', 'emotion-tired', 'emotion-lonely', 'emotion-expect', 'emotion-warm']

function lcg(seed: number): () => number {
    let state = seed % 2147483647
    if (state <= 0) state += 2147483646
    return () => {
        state = (state * 16807) % 2147483647
        return (state - 1) / 2147483646
    }
}

function makeEvent(template: DemoEventTemplate, createdAt: string, nowIso: string): Event {
    return {
        id: `demo_evt_${template.key}`,
        kind: template.kind,
        title: template.title,
        notes: template.kind === 'principle' ? '只作参照，不打卡，不计分。' : '',
        tagId: template.kind === 'principle' ? null : template.tagId,
        status: 'active',
        frequency: template.frequency,
        targetValue: template.targetValue,
        targetUnit: template.targetUnit,
        createdAt,
        updatedAt: nowIso,
        deletedAt: null
    }
}

function makeInstance(event: Event, date: BusinessDate, boundaryHour: number, timezone: string, nowIso: string): Instance {
    const periodStart = date
    void periodStart
    const window = windowOf(date, boundaryHour, timezone)
    return {
        id: `demo_inst_${event.id.replace('demo_evt_', '')}_${date.replace(/-/g, '')}`,
        eventId: event.id,
        businessDate: date,
        windowStart: window.start,
        windowEnd: window.end,
        timezone: 'Asia/Shanghai',
        dayBoundaryHour: boundaryHour,
        status: 'pending',
        targetValue: event.targetValue,
        targetUnit: event.targetUnit,
        completedAt: null,
        createdAt: nowIso
    }
}

export function applyDemoData(doc: DataDocument, today: BusinessDate, nowIso: string): DataDocument {
    if (doc.profile === null) return doc
    const boundaryHour = doc.settings.dayBoundaryHour
    const timezone = doc.settings.timezone
    const random = lcg(20261116)
    const createdAt = new Date(Date.parse(`${today}T00:00:00.000Z`) - 14 * 86400000).toISOString()

    const events: Event[] = TEMPLATES.map((template, index) => ({
        ...makeEvent(template, createdAt, nowIso),
        createdAt: new Date(Date.parse(createdAt) + index * 60000).toISOString()
    }))
    const eventById = new Map(events.map((item) => [item.id, item]))
    const tagById = new Map<string, Tag>(doc.tags.map((item) => [item.id, item]))
    const dates: BusinessDate[] = []
    for (let i = 13; i >= 1; i -= 1) dates.push(addDays(today, -i))

    const instances: Instance[] = []
    const activities: Activity[] = []
    const ledger: LedgerEntry[] = []
    const diaries: Diary[] = []
    const timers: TimerSession[] = []
    const demo = {
        eventIds: events.map((item) => item.id),
        instanceIds: [] as string[],
        activityIds: [] as string[],
        diaryIds: [] as string[],
        ledgerIds: [] as string[],
        snapshotDates: [] as BusinessDate[],
        timerIds: [] as string[]
    }
    let sequence = 0

    for (const date of dates) {
        const dayInstances: Instance[] = []
        for (const event of events) {
            if (event.kind === 'principle' || event.status !== 'active') continue
            if (event.frequency === 'weekly') {
                const day = parseDateParts(date)
                const weekday = new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()
                if (weekday !== 1) continue
            }
            if (event.frequency === 'monthly') {
                const day = parseDateParts(date)
                if (day.day !== 1) continue
            }
            dayInstances.push(makeInstance(event, date, boundaryHour, timezone, nowIso))
        }

        const dayNet = { mindfulness: 0, freedom: 0 }
        for (const instance of dayInstances) {
            instances.push(instance)
            demo.instanceIds.push(instance.id)
            const event = eventById.get(instance.eventId)
            if (!event) continue
            const tag = event.tagId ? tagById.get(event.tagId) ?? null : null
            const chance = event.kind === 'todo' ? 0.72 : 0.66
            if (random() > chance) continue

            sequence += 1
            const hour = 8 + Math.floor(random() * 13)
            const occurredAt = new Date(Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(random() * 60)).padStart(2, '0')}:00.000Z`)).toISOString()
            const durationSeconds = instance.targetUnit === 'minutes' ? instance.targetValue * 60 : 0
            const quantity = instance.targetUnit === 'minutes' ? 1 : Math.max(1, Math.round(instance.targetValue))
            const activity: Activity = {
                id: `demo_act_${String(sequence).padStart(4, '0')}`,
                instanceId: instance.id,
                sourceKey: `demo:ci:${instance.id}`,
                kind: 'checkin',
                purpose: null,
                occurredAt,
                recordedAt: occurredAt,
                quantity,
                durationSeconds,
                note: null,
                demo: true,
                revokedAt: null,
                createdAt: occurredAt
            }
            activities.push(activity)
            demo.activityIds.push(activity.id)

            if (event.kind === 'habit') {
                const score = computeScore({ source: 'habitCheckin', tag, dayNet, rules: doc.rules })
                const entry = makeLedger(activity.id, date, 'habitCheckin', score, nowIso, doc.rules.rulesVersion)
                ledger.push(entry)
                demo.ledgerIds.push(entry.id)
                dayNet.mindfulness = round1(dayNet.mindfulness + score.mindfulness)
                dayNet.freedom = round1(dayNet.freedom + score.freedom)
            }

            const progress = computeProgress(instance.targetUnit, instance.targetValue, [activity])
            if (progress.value >= instance.targetValue) {
                instance.status = 'completed'
                instance.completedAt = occurredAt
                const bonus = computeScore({
                    source: event.kind === 'todo' ? 'todoCompleted' : 'habitGoalBonus',
                    tag,
                    dayNet,
                    rules: doc.rules
                })
                const entry = makeLedger(instance.id, date, event.kind === 'todo' ? 'todoCompleted' : 'habitGoalBonus', bonus, nowIso, doc.rules.rulesVersion)
                ledger.push(entry)
                demo.ledgerIds.push(entry.id)
                dayNet.mindfulness = round1(dayNet.mindfulness + bonus.mindfulness)
                dayNet.freedom = round1(dayNet.freedom + bonus.freedom)
            }
        }

        if (random() < 0.62) {
            const emotionCount = 1 + Math.floor(random() * 2)
            const tagIds: string[] = []
            for (let i = 0; i < emotionCount; i += 1) {
                const pick = EMOTION_IDS[Math.floor(random() * EMOTION_IDS.length)]
                if (pick && !tagIds.includes(pick)) tagIds.push(pick)
            }
            if (tagIds.length === 0) tagIds.push('emotion-calm')
            const text = DIARY_TEXTS[diaries.length % DIARY_TEXTS.length] ?? DIARY_TEXTS[0]
            const diary: Diary = {
                id: `demo_diary_${date.replace(/-/g, '')}`,
                businessDate: date,
                content: text ?? '',
                tagIds: tagIds.slice(0, 3),
                intensity: (2 + Math.floor(random() * 4)) as 1 | 2 | 3 | 4 | 5,
                createdAt: `${date}T21:10:00.000Z`,
                updatedAt: `${date}T21:10:00.000Z`,
                deletedAt: null,
                demo: true
            }
            diaries.push(diary)
            demo.diaryIds.push(diary.id)
        }

        if (random() < 0.46) {
            const sessionId = `demo_timer_${date.replace(/-/g, '')}`
            const focus = random() < 0.7
            const minutes = focus ? [25, 45][Math.floor(random() * 2)] ?? 25 : 15
            const session: TimerSession = {
                id: sessionId,
                instanceId: null,
                mode: 'countdown',
                purpose: focus ? 'focus' : 'rest',
                plannedSeconds: minutes * 60,
                status: 'finished',
                startedAt: `${date}T14:00:00.000Z`,
                resumedAt: null,
                finishedAt: `${date}T14:${String(minutes).padStart(2, '0')}:00.000Z`,
                accumulatedSeconds: minutes * 60,
                recordedActivityId: null,
                demo: true
            }
            timers.push(session)
            demo.timerIds.push(sessionId)
            sequence += 1
            const activity: Activity = {
                id: `demo_act_${String(sequence).padStart(4, '0')}`,
                instanceId: null,
                sourceKey: `demo:timer:${sessionId}`,
                kind: 'timer',
                purpose: focus ? 'focus' : 'rest',
                occurredAt: `${date}T14:00:00.000Z`,
                recordedAt: `${date}T14:${String(minutes).padStart(2, '0')}:00.000Z`,
                quantity: 1,
                durationSeconds: minutes * 60,
                note: null,
                demo: true,
                revokedAt: null,
                createdAt: `${date}T14:00:00.000Z`
            }
            activities.push(activity)
            demo.activityIds.push(activity.id)
            session.recordedActivityId = activity.id
            if (focus) {
                const score = computeScore({ source: 'focusTimer', units: Math.floor((minutes * 60) / 600), tag: null, dayNet, rules: doc.rules })
                const entry = makeLedger(activity.id, date, 'focusTimer', score, nowIso, doc.rules.rulesVersion)
                ledger.push(entry)
                demo.ledgerIds.push(entry.id)
                dayNet.mindfulness = round1(dayNet.mindfulness + score.mindfulness)
                dayNet.freedom = round1(dayNet.freedom + score.freedom)
            }
        }
    }

    for (const diary of diaries) {
        const tag = diary.tagIds.length > 0 ? tagById.get(diary.tagIds[0] ?? '') ?? null : null
        const score = computeScore({ source: 'diaryEntry', tag, dayNet: { mindfulness: 0, freedom: 0 }, rules: doc.rules })
        const entry = makeLedger(diary.id, diary.businessDate, 'diaryEntry', score, nowIso, doc.rules.rulesVersion)
        ledger.push(entry)
        demo.ledgerIds.push(entry.id)
        if (diary.content.length >= doc.rules.scoring.longDiaryThreshold) {
            const bonus = computeScore({ source: 'diaryLong', tag, dayNet: { mindfulness: 0, freedom: 0 }, rules: doc.rules })
            const bonusEntry = makeLedger(`${diary.id}_long`, diary.businessDate, 'diaryLong', bonus, nowIso, doc.rules.rulesVersion)
            ledger.push(bonusEntry)
            demo.ledgerIds.push(bonusEntry.id)
        }
    }

    const snapshots = settleDates([...doc.ledgerEntries, ...ledger], doc.snapshots, dates, nowIso)
    const verdicts = dates.map((date) => {
        const snapshot = snapshots.find((item) => item.businessDate === date)
        const titles = buildTitleState(doc.rules.titles.mindfulness, doc.rules.titles.freedom, snapshot?.mindfulnessTotal ?? 0, snapshot?.freedomTotal ?? 0)
        const diary = diaries.find((item) => item.businessDate === date)
        const topEmotion = diary?.tagIds[0] ?? null
        return buildVerdict({
            rules: doc.rules,
            businessDate: date,
            profileId: doc.profile?.id ?? 'demo',
            mindfulnessDelta: snapshot?.mindfulnessDelta ?? 0,
            freedomDelta: snapshot?.freedomDelta ?? 0,
            dominantTagId: null,
            topEmotionTagId: topEmotion,
            titleName: titles.mindfulness.name,
            createdAt: nowIso
        })
    })
    demo.snapshotDates = dates

    doc.events = [...doc.events, ...events]
    doc.instances = [...doc.instances, ...instances]
    doc.activities = [...doc.activities, ...activities]
    doc.diaries = [...doc.diaries, ...diaries]
    doc.timerSessions = [...doc.timerSessions, ...timers]
    doc.ledgerEntries = [...doc.ledgerEntries, ...ledger]
    doc.snapshots = snapshots
    doc.verdicts = [...doc.verdicts, ...verdicts.filter((item) => !doc.verdicts.some((existing) => existing.businessDate === item.businessDate))]
    doc.meta.demo = { loaded: true, ...demo }
    doc.profile.demoDataLoaded = true
    doc.updatedAt = nowIso
    doc.changeLogs.push({
        id: createId(),
        entityType: 'demo',
        entityId: 'demo',
        action: 'create',
        before: null,
        after: '载入示例修行记录',
        createdAt: nowIso
    })
    return doc
}

function makeLedger(
    sourceId: string,
    date: BusinessDate,
    sourceType: LedgerEntry['sourceType'],
    score: { mindfulness: number; freedom: number },
    nowIso: string,
    ruleVersion: string
): LedgerEntry {
    return {
        id: `demo_ledger_${sourceType}_${sourceId}`.slice(0, 40),
        businessDate: date,
        sourceType,
        sourceId,
        sourceVersion: 1,
        mindfulnessDelta: score.mindfulness,
        freedomDelta: score.freedom,
        ruleVersion,
        reversedBy: null,
        demo: true,
        createdAt: nowIso
    }
}