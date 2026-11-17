# 队友上手指南（Getting Started）

从 GitHub 拉取代码到跑起来的完整步骤，以及这台项目开发过程中真实踩过的环境坑与对应解法。遇到问题先对号入座第 4 节，再回头读第 5 节的原理。

## 0. 环境要求

| 项目 | 要求 | 自检命令 |
| --- | --- | --- |
| 操作系统 | Windows 10/11 x64（主力平台） | — |
| Node.js | ≥ 20（项目在 Node 24 上验证） | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | 任意近期版本 | `git --version` |

首次构建需要联网下载 Electron 运行时（约 100 MB）。

## 1. 拉取与安装

```powershell
git clone https://github.com/Qiqi-218/moyu-merit-book-pc.git
cd moyu-merit-book-pc
npm install
```

- 正常情况下 `npm install` 会自动下载 Electron 运行时，1–3 分钟完成。
- 下载慢或卡住，先设镜像再装：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install
```

## 2. 启动开发模式

```powershell
npm run dev
```

首次启动会进入「首次入道」三步向导（道号 → 可选口令 → 日界线与示例数据）。数据只存本机：

- 开发模式：`%APPDATA%\moyu-merit-book\`
- 打包安装版：`%APPDATA%\摸鱼功德簿\`

想重置数据，删除对应目录即可。

## 3. 校验命令（提交前请全跑一遍）

```powershell
npm run typecheck   # 主进程 + 渲染层 TypeScript，0 error
npm run test        # Vitest 全量单测（当前 44 条）
npm run build       # 生产构建，产出 out/
npm run lint:guard  # 色值 / 零网络 / 禁用文案 三项红线
npm run dist:win    # Windows NSIS + portable 安装包，产出 release\
```

`dist:win` 首次执行会下载打包工具（NSIS / winCodeSign），先设镜像：

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

## 4. 疑难排查（按症状对号入座）

| 症状 | 原因 | 解法 |
| --- | --- | --- |
| `npm install` 报 `'node' 不是内部或外部命令` | npm 用 cmd 执行脚本时 PATH 异常 | 见 4.1 |
| `npm run dev` 报 `Error: Electron uninstall` | `node_modules/electron/path.txt` 缺失 | 运行 `scripts/fix-binaries.ps1` |
| `npm run test` 报 esbuild `The service was stopped` | esbuild 平台二进制缺失或版本错配 | 重跑 `npm install --ignore-scripts`，再运行 `scripts/fix-binaries.ps1` |
| `cmd /c node -v` 提示找不到 node，但 PowerShell 里正常 | 系统 PATH 存在大量重复条目（超长截断） | 见 4.1 第 3 条 |
| `npm install` 清理时报 `EBUSY` / `EPERM` | esbuild 服务进程或编辑器占用目录 | 关掉 VSCode 与残留 node 进程；删不掉先 `Rename-Item node_modules node_modules.bak` |

### 4.1 npm 脚本壳 PATH 问题

部分机器的系统 PATH 里有大量重复条目（nodejs、anaconda、CUDA、jdk），导致 npm 用 cmd 执行脚本时找不到 node。三条路任选其一：

1. **临时绕过**（需已安装 Git）：

```powershell
$env:npm_config_script_shell="C:\Program Files\Git\bin\bash.exe"
npm install
```

1. **跳过安装脚本 + 一键补齐**：

```powershell
npm install --ignore-scripts
powershell -ExecutionPolicy Bypass -File scripts\fix-binaries.ps1
```

1. **根治**：打开「系统属性 → 环境变量」，把系统与用户 PATH 里的重复项清掉（nodejs 各只留一条），并把 `C:\Program Files\nodejs` 移到靠前位置。重开终端后验证：

```powershell
cmd /c node -v
```

有输出即根治，此后 `npm install` 无需任何特殊处理。

## 5. `fix-binaries.ps1` 做了什么

1. 检查 `node_modules/electron/dist/electron.exe`；缺失则按 `node_modules/electron/package.json` 的版本从镜像下载 zip 并解压；
2. 写入 `node_modules/electron/path.txt`（内容 `electron.exe`，**无换行**——electron-vite 靠它定位运行时，读取后不做 trim）；
3. 用 `node -p "require('electron')"` 自检，输出 exe 完整路径即成功。

## 6. 项目约定速览

- 门禁五连未全绿不得宣称完成；提交信息用中文 conventional commits（如 `feat: 实现每日结算`）。
- 界面文案中文、代码标识符英文；文案红线清单见 `src/shared/constants.ts` 的 `FORBIDDEN_PHRASES`。
- 运行时零网络：不引入 UI 库 / 图表库 / CSS 框架 / 图标库 / dayjs / axios；图表手写 SVG。
- 计分、结算、判词只在主进程计算；渲染层只经 `window.moyu` 调用。
- 规则文件外置 `data/rules.json`，说明见 `docs/rules.md`；架构与验收见 `README.md` 与 `docs/ACCEPTANCE.md`。
