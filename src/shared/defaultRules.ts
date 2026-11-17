import type { Rules } from './types/rules'

export const DEFAULT_RULES: Rules = {
    rulesVersion: '1.0.0',
    scoring: {
        todoCompleted: { mindfulness: 8, freedom: 2 },
        habitCheckin: { mindfulness: 5, freedom: 2 },
        habitGoalBonus: { mindfulness: 5, freedom: 2 },
        focusPer10Min: { mindfulness: 3, freedom: 1 },
        diaryEntry: { mindfulness: 3, freedom: 6 },
        diaryLongBonus: { mindfulness: 0, freedom: 2 },
        perEntryCap: 30,
        perDayCap: 80,
        diaryScoredLimit: 3,
        longDiaryThreshold: 100
    },
    tagCoefficient: { base: 0.5 },
    titles: {
        mindfulness: [
            { name: '凡人', threshold: 0 },
            { name: '清心入定', threshold: 100 },
            { name: '明心见性', threshold: 300 },
            { name: '心如止水', threshold: 600 }
        ],
        freedom: [
            { name: '凡人', threshold: 0 },
            { name: '自在逍遥', threshold: 100 },
            { name: '乘物游心', threshold: 300 },
            { name: '逍遥无待', threshold: 600 }
        ]
    },
    achievements: [
        {
            id: 'first-step',
            name: '初入修行',
            line: 'both',
            conditionType: 'firstActivity',
            threshold: 1,
            description: '落下第一笔有效行止',
            emoji: '🌱',
            sort: 1
        },
        {
            id: 'focus-8h',
            name: '专注达人',
            line: 'mindfulness',
            conditionType: 'focusSeconds',
            threshold: 28800,
            description: '累计专注 8 小时',
            emoji: '⏳',
            sort: 2
        },
        {
            id: 'focus-50h',
            name: '专注宗师',
            line: 'mindfulness',
            conditionType: 'focusSeconds',
            threshold: 180000,
            description: '累计专注 50 小时',
            emoji: '🧘',
            sort: 3
        },
        {
            id: 'mood-7d',
            name: '情绪觉察者',
            line: 'freedom',
            conditionType: 'diaryDayStreak',
            threshold: 7,
            description: '连续 7 天写下手记',
            emoji: '🍃',
            sort: 4
        },
        {
            id: 'diary-100',
            name: '情绪史官',
            line: 'freedom',
            conditionType: 'diaryCount',
            threshold: 100,
            description: '累计写下 100 篇手记',
            emoji: '📖',
            sort: 5
        },
        {
            id: 'todo-10',
            name: '生活艺术家',
            line: 'mindfulness',
            conditionType: 'todoCompletedCount',
            threshold: 10,
            description: '完成 10 个待办',
            emoji: '🎨',
            sort: 6
        },
        {
            id: 'habit-7d',
            name: '习惯养成者',
            line: 'mindfulness',
            conditionType: 'habitDayStreak',
            threshold: 7,
            description: '任一习惯连续 7 天达标',
            emoji: '🌾',
            sort: 7
        },
        {
            id: 'title-5',
            name: '探索者',
            line: 'both',
            conditionType: 'titleCount',
            threshold: 5,
            description: '解锁 5 个称号（不含凡人）',
            emoji: '🧭',
            sort: 8
        },
        {
            id: 'freedom-1000',
            name: '自在行者',
            line: 'freedom',
            conditionType: 'freedomTotal',
            threshold: 1000,
            description: '累计逍遥值达到 1000',
            emoji: '☁️',
            sort: 9
        },
        {
            id: 'streak-30',
            name: '守心人',
            line: 'both',
            conditionType: 'recordDayStreak',
            threshold: 30,
            description: '连续 30 天有任意记录',
            emoji: '🕯',
            sort: 10
        },
        {
            id: 'export-3',
            name: '卷宗管理员',
            line: 'both',
            conditionType: 'exportCount',
            threshold: 3,
            description: '累计导出 3 次卷宗',
            emoji: '🗂',
            sort: 11
        },
        {
            id: 'dawn-dusk',
            name: '晨钟暮鼓',
            line: 'both',
            conditionType: 'earlyLate',
            threshold: 2,
            description: '06:00 前与 22:00 后各记录一次',
            emoji: '🌅',
            sort: 12
        }
    ],
    verdictTemplates: [
        {
            id: 'verdict-m1',
            tier: 'mindfulness',
            simple: '今日修行，心似闲云；不争不扰，自有清风入怀。',
            polished: '心若止水，方能照见万物；放下执念，便是自由。'
        },
        {
            id: 'verdict-m2',
            tier: 'mindfulness',
            simple: '案前一刻，胜过千般空想；今日之功，已落卷宗。',
            polished: '一笔一画皆是修行，不必求快，只求不欺。'
        },
        {
            id: 'verdict-m3',
            tier: 'mindfulness',
            simple: '守得方寸清明，便是一日好修行。',
            polished: '尘劳不染心，灯下亦山林。'
        },
        {
            id: 'verdict-f1',
            tier: 'freedom',
            simple: '偷得浮生半日闲，亦是功德一件。',
            polished: '会休息的人，才走得更远；今日之闲，养明日之气。'
        },
        {
            id: 'verdict-f2',
            tier: 'freedom',
            simple: '且放白鹿青崖间，须行即骑访名山。',
            polished: '松弛不是懈怠，是把心放回原处。'
        },
        {
            id: 'verdict-f3',
            tier: 'freedom',
            simple: '今日不问前程，只看云卷云舒。',
            polished: '心安处，即是归途。'
        },
        {
            id: 'verdict-b1',
            tier: 'balanced',
            simple: '半日精进，半日闲；张弛有度，方为修行。',
            polished: '收放之间，自有分寸；今日的你，刚刚好。'
        },
        {
            id: 'verdict-b2',
            tier: 'balanced',
            simple: '一动一静，皆为道场。',
            polished: '入世做事，出世养心，两不相误。'
        },
        {
            id: 'verdict-b3',
            tier: 'balanced',
            simple: '且记今日行止，静待判官落笔。',
            polished: '日拱一卒，功不唐捐；来日回望，皆是风景。'
        }
    ]
}