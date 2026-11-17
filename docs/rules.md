# 规则文件说明（rules.md）

规则与业务数据分开存放，便于审阅与调整：

1. 生效文件：`<userData>/data/rules.json`
2. 兜底文件：`resources/rules/default-rules.json`（打包后位于 `resources/rules/`）
3. 内置常量：`src/shared/defaultRules.ts`

加载顺序为「生效文件 → 兜底文件 → 内置常量」。任一环节校验失败会记录日志并回退，不中断结算。设置页「打开规则文件」用系统默认程序打开 `data/rules.json`；「恢复默认规则」按钮一键把计分基数、称号阈值、成就与判词模板恢复为默认值，并立即重写 `rules.json`（已产生的功德流水与快照不受影响，变更写入变更日志）。

## 顶层字段

| 字段 | 含义 |
| --- | --- |
| `rulesVersion` | 规则版本，写入每一笔流水，便于追溯 |
| `scoring` | 计分基数、单笔/每日上限、手记计分篇数与长文阈值 |
| `tagCoefficient.base` | 标签系数基数，默认 0.5 |
| `titles` | 正念线与逍遥线的称号阈值阶梯 |
| `achievements` | 12 条成就的定义、线路、条件类型与阈值 |
| `verdictTemplates` | 9 条判词模板（正念 3 / 逍遥 3 / 均衡 3），每条含简版与润色版 |

## 计分基数

| 字段 | 正念 | 逍遥 | 单位 |
| --- | ---: | ---: | --- |
| `todoCompleted` | 8 | 2 | 每课业每次完成 |
| `habitCheckin` | 5 | 2 | 每笔打卡 |
| `habitGoalBonus` | 5 | 2 | 每课业每次达标 |
| `focusPer10Min` | 3 | 1 | 每满 10 分钟 |
| `diaryEntry` | 3 | 6 | 每日前 3 篇 |
| `diaryLongBonus` | 0 | 2 | 正文 ≥ `longDiaryThreshold` |

计算顺序：基数 × 份数 → 乘标签系数 `base + weight`（无标签按权重 0.5，即系数 1.0）→ 单笔封顶 `perEntryCap` → 每日封顶 `perDayCap`。冲正流水直接取负原值，不再经过系数与封顶。

## 称号阈值

- 正念线：凡人 0 / 清心入定 100 / 明心见性 300 / 心如止水 600
- 逍遥线：凡人 0 / 自在逍遥 100 / 乘物游心 300 / 逍遥无待 600

称号实时计算，只增不减，满级显示「已臻化境」。

## 成就条件类型

`firstActivity`、`focusSeconds`、`diaryDayStreak`、`diaryCount`、`todoCompletedCount`、`habitDayStreak`、`titleCount`、`freedomTotal`、`recordDayStreak`、`exportCount`、`earlyLate`。每条成就的 `threshold` 与条件类型对应；已解锁记录写入 `userAchievements`，不因后续数据变化而撤销。

## 判词模板

每条模板包含 `id`、`tier`（mindfulness / freedom / balanced）、`simple`、`polished`。选择逻辑：

1. 按当日正念与逍遥增量判定档位：都为 0 或差值比 ≤ 0.25 为均衡；否则取较大的一侧；
2. 用 `hash(businessDate#profileId#tier#dominantTag#topEmotion)` 在同档模板中稳定选择一条；
3. 简版与润色版同属一条模板，「润色判词」只在两版之间切换，不调用任何外部模型。

修改模板后请同步提升 `rulesVersion`，新产生的流水会记录新版本号；历史流水与历史快照不会被追溯改写。
