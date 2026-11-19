import type { Settings, Tag, ISODate } from './types/models'
import { DEFAULT_RULES } from './defaultRules'

export const APP_NAME = '摸鱼功德簿'
export const APP_NAME_EN = 'MOYU MERIT BOOK'
export const SCHEMA_VERSION = 1
export const TIMEZONE = 'Asia/Shanghai' as const
export const DEFAULT_DAY_BOUNDARY_HOUR = 4
export const DEMO_ID_PREFIX = 'demo_'
export const DEFAULT_AVATAR_SEED = 1

export const FORBIDDEN_PHRASES = [
    '坚持就是胜利',
    '你太懒了',
    '失败',
    '逾期',
    '惩罚',
    '连续中断',
    '加油'
] as const

export interface TagSeed {
    id: string
    kind: 'activity' | 'emotion'
    name: string
    mindfulnessWeight: number
    freedomWeight: number
    emoji: string | null
    color: string | null
    softColor: string | null
}

export const ACTIVITY_TAG_SEEDS: TagSeed[] = [
    { id: 'study', kind: 'activity', name: '学习工作', mindfulnessWeight: 0.9, freedomWeight: 0.3, emoji: null, color: null, softColor: null },
    { id: 'health', kind: 'activity', name: '生活健康', mindfulnessWeight: 0.75, freedomWeight: 0.75, emoji: null, color: null, softColor: null },
    { id: 'sport', kind: 'activity', name: '运动锻炼', mindfulnessWeight: 0.85, freedomWeight: 0.6, emoji: null, color: null, softColor: null },
    { id: 'rest', kind: 'activity', name: '休息放松', mindfulnessWeight: 0.5, freedomWeight: 1.0, emoji: null, color: null, softColor: null },
    { id: 'creative', kind: 'activity', name: '兴趣创作', mindfulnessWeight: 0.6, freedomWeight: 0.85, emoji: null, color: null, softColor: null },
    { id: 'entertainment', kind: 'activity', name: '游戏影音', mindfulnessWeight: 0.35, freedomWeight: 0.8, emoji: null, color: null, softColor: null },
    { id: 'social', kind: 'activity', name: '社交陪伴', mindfulnessWeight: 0.5, freedomWeight: 0.85, emoji: null, color: null, softColor: null }
]

export const EMOTION_TAG_SEEDS: TagSeed[] = [
    { id: 'emotion-happy', kind: 'emotion', name: '开心', mindfulnessWeight: 0, freedomWeight: 0, emoji: '😊', color: '#C98A3E', softColor: '#FBF0DC' },
    { id: 'emotion-calm', kind: 'emotion', name: '平静', mindfulnessWeight: 0, freedomWeight: 0, emoji: '🍃', color: '#4F7A62', softColor: '#E8F0E8' },
    { id: 'emotion-anxious', kind: 'emotion', name: '焦虑', mindfulnessWeight: 0, freedomWeight: 0, emoji: '😰', color: '#8A6E9B', softColor: '#F0EAF4' },
    { id: 'emotion-tired', kind: 'emotion', name: '疲惫', mindfulnessWeight: 0, freedomWeight: 0, emoji: '😪', color: '#7A8078', softColor: '#EFEDE6' },
    { id: 'emotion-lonely', kind: 'emotion', name: '孤独', mindfulnessWeight: 0, freedomWeight: 0, emoji: '🌙', color: '#5E7396', softColor: '#E9EEF6' },
    { id: 'emotion-expect', kind: 'emotion', name: '期待', mindfulnessWeight: 0, freedomWeight: 0, emoji: '✨', color: '#B08A45', softColor: '#F8EFD9' },
    { id: 'emotion-warm', kind: 'emotion', name: '温暖', mindfulnessWeight: 0, freedomWeight: 0, emoji: '🌤', color: '#C2703E', softColor: '#FBEEE4' }
]

export const ALL_TAG_SEEDS: TagSeed[] = [...ACTIVITY_TAG_SEEDS, ...EMOTION_TAG_SEEDS]

export function createBuiltinTags(now: ISODate): Tag[] {
    return ALL_TAG_SEEDS.map((seed) => ({
        id: seed.id,
        kind: seed.kind,
        name: seed.name,
        mindfulnessWeight: seed.mindfulnessWeight,
        freedomWeight: seed.freedomWeight,
        builtin: true,
        emoji: seed.emoji,
        color: seed.color,
        softColor: seed.softColor,
        createdAt: now
    }))
}

export function createDefaultSettings(): Settings {
    return {
        timezone: TIMEZONE,
        dayBoundaryHour: DEFAULT_DAY_BOUNDARY_HOUR,
        theme: 'paper',
        fontSize: 'normal',
        motion: true,
        sound: true,
        notifications: { timer: true, settlement: true, title: true, achievement: true },
        closeToTray: true,
        launchAtLogin: false,
        miniTimerOnTop: true,
        globalShortcuts: true,
        autoSettleOnStart: true,
        aiEnabled: false,
        guidanceSeen: false,
        drafts: {},
        schemaMigrationNote: ''
    }
}

export const DEFAULT_RULES_VERSION = DEFAULT_RULES.rulesVersion

export const EVENT_KIND_LABEL: Record<string, string> = {
    todo: '待办',
    habit: '习惯',
    principle: '原则'
}

export const EVENT_STATUS_LABEL: Record<string, string> = {
    active: '修行中',
    paused: '已暂停',
    ended: '已结束'
}

export const INSTANCE_STATUS_LABEL: Record<string, string> = {
    pending: '待完成',
    inProgress: '进行中',
    completed: '已完成',
    shelved: '已搁置',
    skipped: '已跳过'
}

export const TARGET_UNIT_LABEL: Record<string, string> = {
    times: '次',
    minutes: '分钟',
    quantity: '数量'
}

export const INTENSITY_LABEL: Record<number, string> = {
    1: '低落',
    2: '些微',
    3: '平缓',
    4: '轻快',
    5: '舒展'
}

export const GREETINGS: Array<{ from: number; to: number; text: string }> = [
    { from: 5, to: 8, text: '晨起 · 今日亦可从容' },
    { from: 8, to: 11, text: '日间 · 静心做眼前事' },
    { from: 11, to: 13, text: '午间 · 且歇片刻' },
    { from: 13, to: 18, text: '午后 · 慢一些也无妨' },
    { from: 18, to: 22, text: '夜读 · 灯下亦山林' },
    { from: 22, to: 5, text: '深夜 · 早些安歇' }
]

export const PRIMARY_NAV = [
    { path: '/', label: '修身', icon: 'home' },
    { path: '/events', label: '修行事项', icon: 'list' },
    { path: '/timer', label: '番茄钟', icon: 'timer' },
    { path: '/mind', label: '修心', icon: 'moon' },
    { path: '/records', label: '卷宗', icon: 'book' },
    { path: '/self', label: '灵台', icon: 'user' }
] as const