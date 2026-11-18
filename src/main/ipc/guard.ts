import { IPC } from '@shared/ipc'
import type { InvokeChannel } from '@shared/ipc'
import { isBusinessDate, isUuid } from '@shared/validators'

type Validator = (payload: unknown) => string | null

const BAD_KEYS = ['__proto__', 'constructor', 'prototype']

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasBadKeys(value: Record<string, unknown>): boolean {
    return Object.keys(value).some((key) => BAD_KEYS.includes(key))
}

function object(check?: (value: Record<string, unknown>) => string | null): Validator {
    return (payload) => {
        if (!isRecord(payload)) return '参数格式不正确'
        if (hasBadKeys(payload)) return '参数包含非法字段'
        return check ? check(payload) : null
    }
}

const noArg: Validator = (payload) => (payload === undefined || payload === null ? null : '该操作不需要参数')

function str(value: Record<string, unknown>, key: string, min: number, max: number, optional = false): string | null {
    const field = value[key]
    if (field === undefined || field === null) return optional ? null : `缺少字段 ${key}`
    if (typeof field !== 'string') return `字段 ${key} 需要是文字`
    if (field.length < min) return `字段 ${key} 至少 ${min} 个字符`
    if (field.length > max) return `字段 ${key} 最多 ${max} 个字符`
    return null
}

function num(value: Record<string, unknown>, key: string, min: number, max: number, optional = false, integer = false): string | null {
    const field = value[key]
    if (field === undefined || field === null) return optional ? null : `缺少字段 ${key}`
    if (typeof field !== 'number' || !Number.isFinite(field)) return `字段 ${key} 需要是数字`
    if (integer && !Number.isInteger(field)) return `字段 ${key} 需要是整数`
    if (field < min || field > max) return `字段 ${key} 超出范围`
    return null
}

function bool(value: Record<string, unknown>, key: string, optional = false): string | null {
    const field = value[key]
    if (field === undefined) return optional ? null : `缺少字段 ${key}`
    if (typeof field !== 'boolean') return `字段 ${key} 需要是布尔值`
    return null
}

function oneOf(value: Record<string, unknown>, key: string, options: string[], optional = false): string | null {
    const field = value[key]
    if (field === undefined) return optional ? null : `缺少字段 ${key}`
    if (typeof field !== 'string' || !options.includes(field)) return `字段 ${key} 取值不合法`
    return null
}

function firstError(...errors: Array<string | null>): string | null {
    for (const error of errors) if (error) return error
    return null
}

const eventInput: Validator = object((value) =>
    firstError(
        oneOf(value, 'kind', ['todo', 'habit', 'principle']),
        str(value, 'title', 1, 60),
        str(value, 'notes', 0, 500, true),
        value.tagId === undefined || value.tagId === null ? null : typeof value.tagId === 'string' ? null : '字段 tagId 需要是字符串',
        oneOf(value, 'frequency', ['daily', 'weekly', 'monthly', 'once']),
        num(value, 'targetValue', 0.0001, 100000),
        oneOf(value, 'targetUnit', ['times', 'minutes', 'quantity'])
    )
)

const composition: Validator = (payload) => {
    if (payload === undefined || payload === null) return null
    if (!isRecord(payload)) return '参数格式不正确'
    return firstError(str(payload, 'businessDate', 10, 10, true))
}

const settingsPatch: Validator = object((value) => {
    if ('timezone' in value) return '时区固定为 Asia/Shanghai，不可修改'
    const allowed = [
        'dayBoundaryHour',
        'theme',
        'fontSize',
        'motion',
        'sound',
        'notifications',
        'closeToTray',
        'launchAtLogin',
        'miniTimerOnTop',
        'globalShortcuts',
        'autoSettleOnStart',
        'aiEnabled'
    ]
    for (const key of Object.keys(value)) if (!allowed.includes(key)) return `不支持修改字段 ${key}`
    return firstError(
        value.dayBoundaryHour === undefined ? null : num(value, 'dayBoundaryHour', 0, 23, true, true),
        value.theme === undefined ? null : oneOf(value, 'theme', ['paper', 'night'], true),
        value.fontSize === undefined ? null : oneOf(value, 'fontSize', ['normal', 'large'], true),
        value.motion === undefined ? null : bool(value, 'motion', true),
        value.sound === undefined ? null : bool(value, 'sound', true),
        value.closeToTray === undefined ? null : bool(value, 'closeToTray', true),
        value.launchAtLogin === undefined ? null : bool(value, 'launchAtLogin', true),
        value.miniTimerOnTop === undefined ? null : bool(value, 'miniTimerOnTop', true),
        value.globalShortcuts === undefined ? null : bool(value, 'globalShortcuts', true),
        value.autoSettleOnStart === undefined ? null : bool(value, 'autoSettleOnStart', true),
        value.aiEnabled === undefined ? null : bool(value, 'aiEnabled', true)
    )
})

const diaryInput: Validator = object((value) =>
    firstError(
        str(value, 'businessDate', 10, 10),
        str(value, 'content', 1, 1000),
        Array.isArray(value.tagIds) && value.tagIds.length >= 1 && value.tagIds.length <= 3 ? null : '情绪标签数量应为 1–3',
        num(value, 'intensity', 1, 5, false, true)
    )
)

export const GUARD_VALIDATORS: Record<InvokeChannel, Validator> = {
    [IPC.appBootstrap]: noArg,
    [IPC.appVersion]: noArg,
    [IPC.appOpenDataDir]: noArg,
    [IPC.appOpenRulesFile]: noArg,
    [IPC.appQuit]: noArg,

    [IPC.profileGet]: noArg,
    [IPC.profileCreate]: object((value) =>
        firstError(
            str(value, 'nickname', 2, 64),
            str(value, 'bio', 0, 200, true),
            value.passphrase === undefined || value.passphrase === '' ? null : str(value, 'passphrase', 8, 128, true),
            num(value, 'dayBoundaryHour', 0, 23, false, true),
            bool(value, 'loadDemo'),
            num(value, 'avatarSeed', 1, 3, false, true)
        )
    ),
    [IPC.profileUpdate]: object((value) =>
        firstError(
            value.nickname === undefined ? null : str(value, 'nickname', 2, 64, true),
            value.bio === undefined ? null : str(value, 'bio', 0, 200, true),
            value.avatarSeed === undefined ? null : num(value, 'avatarSeed', 1, 3, true, true)
        )
    ),
    [IPC.profileSetPassphrase]: object((value) =>
        firstError(str(value, 'newPassphrase', 8, 128), value.oldPassphrase === undefined ? null : str(value, 'oldPassphrase', 1, 128, true))
    ),
    [IPC.profileVerifyPassphrase]: object((value) => str(value, 'passphrase', 0, 128)),
    [IPC.profileClearPassphrase]: object((value) => firstError(str(value, 'passphrase', 0, 128), str(value, 'confirmText', 2, 2))),
    [IPC.profileLockState]: noArg,

    [IPC.settingsGet]: noArg,
    [IPC.settingsPatch]: settingsPatch,
    [IPC.rulesReset]: noArg,

    [IPC.tagsList]: noArg,
    [IPC.tagsCreate]: object((value) =>
        firstError(
            oneOf(value, 'kind', ['activity', 'emotion']),
            str(value, 'name', 1, 20),
            num(value, 'mWeight', 0, 1),
            num(value, 'fWeight', 0, 1)
        )
    ),
    [IPC.tagsUpdate]: object((value) =>
        firstError(
            str(value, 'id', 1, 64),
            value.name === undefined ? null : str(value, 'name', 1, 20, true),
            value.mWeight === undefined ? null : num(value, 'mWeight', 0, 1, true),
            value.fWeight === undefined ? null : num(value, 'fWeight', 0, 1, true)
        )
    ),
    [IPC.tagsRemove]: object((value) => str(value, 'id', 1, 64)),

    [IPC.eventsList]: object((value) =>
        firstError(
            value.kind === undefined ? null : oneOf(value, 'kind', ['todo', 'habit', 'principle'], true),
            value.status === undefined ? null : oneOf(value, 'status', ['active', 'paused', 'ended'], true),
            value.tagId === undefined ? null : str(value, 'tagId', 1, 64, true),
            oneOf(value, 'sort', ['recent', 'completed', 'progress']),
            str(value, 'keyword', 0, 60),
            num(value, 'page', 1, 100000, false, true),
            num(value, 'pageSize', 1, 200, false, true)
        )
    ),
    [IPC.eventsGet]: object((value) => str(value, 'id', 1, 64)),
    [IPC.eventsCreate]: eventInput,
    [IPC.eventsUpdate]: object((value) => firstError(str(value, 'id', 1, 64), eventInput(value.input))),
    [IPC.eventsChangeStatus]: object((value) => firstError(str(value, 'id', 1, 64), oneOf(value, 'status', ['active', 'paused', 'ended']))),
    [IPC.eventsRemove]: object((value) => firstError(str(value, 'id', 1, 64), value.confirm === true ? null : '请确认删除')),

    [IPC.instancesListByDate]: object((value) => (isBusinessDate(value.businessDate) ? null : '日期格式不正确')),
    [IPC.instancesGenerateToday]: noArg,
    [IPC.instancesSetStatus]: object((value) =>
        firstError(str(value, 'instanceId', 1, 64), oneOf(value, 'status', ['shelved', 'skipped', 'pending']))
    ),

    [IPC.activitiesCheckIn]: object((value) =>
        firstError(
            str(value, 'instanceId', 1, 64),
            isUuid(value.requestId) ? null : '请求标识格式不正确',
            value.quantity === undefined ? null : num(value, 'quantity', 0.0001, 100000, true),
            value.durationSeconds === undefined ? null : num(value, 'durationSeconds', 0, 86400, true),
            value.note === undefined ? null : str(value, 'note', 0, 500, true)
        )
    ),
    [IPC.activitiesList]: object((value) =>
        firstError(
            value.businessDate === undefined ? null : isBusinessDate(value.businessDate) ? null : '日期格式不正确',
            value.instanceId === undefined ? null : str(value, 'instanceId', 1, 64, true),
            num(value, 'page', 1, 100000, false, true),
            num(value, 'pageSize', 1, 200, false, true)
        )
    ),
    [IPC.activitiesRevoke]: object((value) => firstError(str(value, 'activityId', 1, 64), isUuid(value.requestId) ? null : '请求标识格式不正确')),

    [IPC.timerState]: noArg,
    [IPC.timerStart]: object((value) =>
        firstError(
            oneOf(value, 'mode', ['countup', 'countdown']),
            oneOf(value, 'purpose', ['focus', 'rest']),
            value.plannedMinutes === undefined ? null : num(value, 'plannedMinutes', 1, 180, true),
            value.instanceId === undefined || value.instanceId === null ? null : str(value, 'instanceId', 1, 64, true)
        )
    ),
    [IPC.timerPause]: noArg,
    [IPC.timerResume]: noArg,
    [IPC.timerFinish]: noArg,
    [IPC.timerRecord]: object((value) =>
        firstError(str(value, 'sessionId', 1, 64), value.instanceId === undefined ? null : str(value, 'instanceId', 1, 64, true))
    ),
    [IPC.timerDiscard]: noArg,
    [IPC.timerOpenMini]: noArg,

    [IPC.diaryListMonth]: object((value) => firstError(num(value, 'year', 1970, 3000, false, true), num(value, 'month', 1, 12, false, true))),
    [IPC.diaryListDate]: object((value) => (isBusinessDate(value.businessDate) ? null : '日期格式不正确')),
    [IPC.diaryGet]: object((value) => str(value, 'id', 1, 64)),
    [IPC.diaryCreate]: diaryInput,
    [IPC.diaryUpdate]: object((value) => firstError(str(value, 'id', 1, 64), diaryInput(value.input))),
    [IPC.diaryRemove]: object((value) => firstError(str(value, 'id', 1, 64), value.confirm === true ? null : '请确认删除')),
    [IPC.diaryGetDraft]: object((value) => str(value, 'scope', 1, 120)),
    [IPC.diarySaveDraft]: object((value) => {
        if (!isRecord(value.payload)) return '草稿格式不正确'
        return str(value, 'scope', 1, 120)
    }),
    [IPC.diaryClearDraft]: object((value) => str(value, 'scope', 1, 120)),

    [IPC.settlementStatus]: noArg,
    [IPC.settlementRun]: composition,
    [IPC.settlementSettleMissing]: noArg,

    [IPC.recordsOverview]: object((value) => (isBusinessDate(value.businessDate) ? null : '日期格式不正确')),
    [IPC.recordsTrend]: object((value) =>
        firstError(
            oneOf(value, 'kind', ['focus', 'rest', 'emotion', 'values']),
            isBusinessDate(value.rangeStart) ? null : '开始日期不正确',
            isBusinessDate(value.rangeEnd) ? null : '结束日期不正确'
        )
    ),
    [IPC.recordsArchiveDaily]: object((value) => firstError(num(value, 'page', 1, 100000, false, true), num(value, 'pageSize', 1, 100, false, true))),
    [IPC.recordsArchivePeriod]: object((value) =>
        firstError(oneOf(value, 'period', ['weekly', 'monthly']), num(value, 'page', 1, 100000, false, true), num(value, 'pageSize', 1, 100, false, true))
    ),
    [IPC.recordsHistory]: object((value) =>
        firstError(
            oneOf(value, 'sortBy', ['date', 'mindfulness', 'freedom', 'focus', 'records']),
            oneOf(value, 'sortDir', ['asc', 'desc']),
            num(value, 'page', 1, 100000, false, true),
            num(value, 'pageSize', 1, 100, false, true)
        )
    ),
    [IPC.recordsDailyDetail]: object((value) => (isBusinessDate(value.businessDate) ? null : '日期格式不正确')),
    [IPC.recordsSearch]: object((value) => str(value, 'keyword', 0, 60)),

    [IPC.achievementsList]: noArg,

    [IPC.backupExportJson]: noArg,
    [IPC.backupCreate]: noArg,
    [IPC.backupRestore]: noArg,
    [IPC.backupImportJson]: noArg,
    [IPC.backupClearDemo]: object((value) => (value.confirm === true ? null : '请确认清除示例数据')),
    [IPC.backupClearAll]: object((value) => (value.confirmText === '清空' ? null : '请输入「清空」以确认')),

    [IPC.windowState]: noArg,
    [IPC.windowMinimize]: noArg,
    [IPC.windowToggleMaximize]: noArg,
    [IPC.windowClose]: noArg,
    [IPC.windowSetFullscreen]: object((value) => bool(value, 'value')),
    [IPC.windowSetMiniAlwaysOnTop]: object((value) => bool(value, 'value'))
}

export function guardPayload(channel: InvokeChannel, payload: unknown): string | null {
    const validator = GUARD_VALIDATORS[channel]
    if (!validator) return '通道未登记校验规则'
    return validator(payload)
}