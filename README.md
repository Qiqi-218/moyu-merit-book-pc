# 摸鱼功德簿

把待办、习惯、专注计时与情绪记录，折算成「正念值」与「逍遥值」两项互不抵消的功德，用本地判词、称号与卷宗给出温和反馈的桌面修行工具。

- 本地单机、无需联网、无需注册，数据只存本机；
- Electron + Vue 3 + TypeScript + Pinia + Vue Router（hash 模式）；
- 主进程是唯一可信数据源，渲染层只做界面；
- 图表全部为手写内联 SVG，无 UI 库、图表库、CSS 框架、图标库、dayjs、axios。

## 一、运行与校验

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run dist:win      # 生成 Windows NSIS / portable 安装包
```

辅助命令：

```bash
npm run dev           # 开发模式
npm run lint:guard    # 裸色值 / 外链 / 禁用文案三项红线检查
npm run test:cov      # 覆盖率
npm run pack          # 免安装目录
```

### 本环境实测结果

| 校验 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查（主进程） | `tsc -p tsconfig.node.json --noEmit` | exit 0，0 error |
| 类型检查（渲染层） | `tsc -p tsconfig.web.json --noEmit` | exit 0，0 error |
| 单元测试 | `npm run test` | 6 个测试文件、40 个用例全部通过，exit 0 |
| 构建 | `npm run build` | `out/main`、`out/preload`、`out/renderer/index.html`、`out/renderer/mini-timer.html` 均生成，exit 0 |
| 设计红线 | `npm run lint:guard` | 三项脚本均通过 |
| 依赖安装 | `npm install --ignore-scripts` | exit 0，生成 `package-lock.json` |
| Windows 安装包 | `npm run dist:win` | 未执行：沙箱网络限制导致 Electron 运行时二进制无法下载 |

> **环境说明**：当前沙箱对 `npmmirror.com` 等下载域名做了限制，`npm install` 在 Electron postinstall 下载运行时处会被阻断；因此本环境使用 `npm install --ignore-scripts` 完成依赖与锁文件，并通过本地已安装的 esbuild 0.25 二进制对齐测试工具链。在可正常访问 npm 与 Electron 镜像的 Windows 机器上，直接执行 `npm install` 即可，无需任何手工步骤。

## 二、架构

```
shared 契约层（类型 / IPC 通道 / Result / 校验 / 规则）
        ↓
domain 纯函数（业务日 / 进度 / 计分 / 结算 / 判词 / 称号 / 成就 / 聚合 / 示例）
        ↓
store 数据层（JSON 仓库 / 串行写队列 / 原子写 / 备份 / 迁移 / 索引）
        ↓
services 服务层（14 个域服务，唯一允许同时依赖 domain + store + Electron 的层）
        ↓
ipc + preload（69 个 invoke 通道 + 9 个事件，入参守卫）
        ↓
renderer（Vue 3 页面 + Pinia 界面缓存，只能经 window.moyu 触达主进程）
```

安全基线：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`、`webSecurity: true`、`webviewTag: false`；preload 只暴露 `window.moyu`，不暴露 `ipcRenderer`；主进程对所有 IPC 入参做结构、类型、长度、枚举、数值范围与原型污染键校验；运行时通过 CSP 与 `webRequest` 双重拦截外部网络。

## 三、目录结构

```
hwict/
├─ package.json / package-lock.json
├─ electron.vite.config.ts
├─ electron-builder.json          # electron-builder 配置（JSON 等价于 yml）
├─ tsconfig.json / tsconfig.node.json / tsconfig.web.json
├─ vitest.config.ts / eslint.config.mjs
├─ build/                         # icon.png / icon.ico
├─ resources/                     # default-rules.json / tray 图标
├─ scripts/                       # 图标与规则生成、三项红线检查
├─ docs/                          # 验收清单、规则说明
└─ src/
   ├─ shared/                     # result / ipc / constants / validators / defaultRules / types
   ├─ main/
   │  ├─ index.ts                 # 生命周期、单实例、窗口、托盘、通知、快捷键
   │  ├─ windows/                 # 主窗 / 迷你计时窗
   │  ├─ desktop/                 # tray / menu / shortcuts / notifications / autostart
   │  ├─ ipc/                     # channels / guard / registerHandlers
   │  ├─ services/                # 14 个域服务
   │  ├─ domain/                  # 纯函数与单测
   │  ├─ store/                   # JSON 仓库、原子写、写队列、备份、迁移、索引
   │  └─ utils/                   # id / hash / time / password / logger / result
   ├─ preload/                    # 白名单 window.moyu
   └─ renderer/
      ├─ index.html / mini-timer.html
      └─ src/
         ├─ App.vue / router / api / stores / composables / utils
         ├─ components/layout | common | charts
         ├─ views/                # 14 个页面
         └─ styles/               # tokens / themes / base / motion
```

## 四、数据与持久化

- 主文档：`app.getPath('userData')/data/moyu.json`
- 写入顺序：序列化 → 复制上一版到 `.bak` → 写 `.tmp` → `fsync` → `rename` 原子替换
- 写入串行化：同一时刻只有一个落盘任务，写操作成功后才更新内存镜像与界面
- 备份：启动、每日首次写入、导入前、手动备份四类触发；`backups/` 最多保留 30 份
- 迁移：`schemaVersion` 逐级迁移，缺失迁移会中止而不是静默升级
- 规则：外置 `data/rules.json`，加载顺序 `data/rules.json → resources/rules/default-rules.json → 内置常量`
- 导出的 JSON 会把口令哈希与盐置空；变更日志与系统通知不含手记正文与口令

## 五、计分与结算摘要

- 标签系数 = `0.5 + 权重`；无标签按权重 0.5 计，即系数 1.0
- 待办完成 8 / 2；习惯每次打卡 5 / 2；习惯达标额外 5 / 2；专注每满 10 分钟 3 / 1；手记前 3 篇 3 / 6；正文 ≥100 字额外 0 / 2
- 单笔 ≤ 30，每人每业务日每条线 ≤ 80；达到上限增量记 0，但活动仍入库、进度仍推进
- 冲正写入负数流水，不删除原流水；已结算日期会重算当日快照并顺延之后累计
- 业务日：固定 `Asia/Shanghai`，日界线默认 04:00，用 `Intl` 朴素时间法计算，不依赖系统时区
- 判词：按当日双值增量分三档，再用 `hash(businessDate#profileId#tier#tag#emotion)` 稳定选择 9 条模板之一
- 称号：正念 / 逍遥各 0、100、300、600；成就 12 条，解锁后不可撤销

完整规则见 [`docs/rules.md`](docs/rules.md)。

## 六、快捷键

| 组合键 | 作用 |
| --- | --- |
| `Ctrl+1~4` | 修身 / 修行事项 / 番茄钟 / 修心 |
| `Ctrl+N` | 立一桩修行 |
| `Ctrl+Shift+D` | 写手记 |
| `Ctrl+Shift+T` | 开始 / 暂停计时（全局，可在设置关闭） |
| `Ctrl+K` | 命令面板 |
| `Ctrl+F` | 聚焦事项搜索 |
| `Esc` | 关闭弹窗 / 命令面板 |
| `F11` | 全屏 |
| `←/→`、`↑/↓` | 月历切月 / 切日 |

## 七、验收清单（22 条）

逐条记录见 [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md)。当前状态：

- ✅ 代码实现并在本环境通过自动化校验：类型检查、40 条单元测试、生产构建、三项设计红线；
- ⬜ 需要图形桌面环境人工操作的条目（入道/解锁完整交互、托盘、系统通知、迷你窗、打包安装等）已在文档中给出操作步骤，本沙箱因 Electron 运行时无法下载而未能实机点击。

## 八、已知限制

1. 当前沙箱网络限制导致 Electron 运行时未安装，`npm run dev`、托盘、通知、迷你窗、`npm run dist:win` 无法在本环境实机验证；`electron-builder.json` 已完整配置 NSIS + portable + mac dmg + linux AppImage/deb，`publish: null`。
2. 迷你计时器入口在构建产物中为 `out/renderer/mini-timer.html`（electron-vite 保留原文件名），主进程已按该路径加载。
3. 「恢复默认规则」以文档说明方式提供：删除 `data/rules.json` 后重启即会重新生成默认规则，未额外占用一个 IPC 通道。
4. 设置页的 AI 判词开关按规范仅作预留，默认关闭，不产生任何网络或模型调用。

## 九、常见问题

- **数据在哪？** 设置 → 数据 → 打开数据目录；主文件为 `data/moyu.json`。
- **忘记口令？** 口令无法找回；解锁页可输入「清空」清除本机数据并回到入道页。
- **主文件坏了？** 启动会尝试读取 `moyu.json.bak`；仍不可读时可在 `backups/` 中取最近快照手工恢复。
- **如何完全离线使用？** 应用不包含任何网络客户端依赖，CSP 禁止外部 `connect-src`，主进程会拦截外部 http/https/ws 请求。
