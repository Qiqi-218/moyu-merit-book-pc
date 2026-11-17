# 队友上手指南（Getting Started）

从 GitHub 拉取代码到跑起来的完整步骤，以及本团队开发过程中真实踩过的环境坑与对应解法。遇到问题先对号入座「安装报错排查」一节。

## 一、快速开始（三分钟看到界面）

前提：已安装 Node.js ≥ 20 与 Git（要求见「三、环境要求」）。在任意目录执行：

```powershell
git clone https://github.com/Qiqi-218/moyu-merit-book-pc.git
cd moyu-merit-book-pc
npm install
npm run dev
```

逐条说明：

1. `git clone`：拉取源码（约 2 MB）。
2. `npm install`：安装依赖并自动下载 Electron 运行时（约 100 MB，1–3 分钟）。下载慢先设镜像：

   ```powershell
   $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
   ```

3. `npm run dev`：约 10 秒后**弹出应用窗口**——宣纸底色、无系统边框、左侧 232px 侧栏。
4. 首次启动进入「首次入道」三步向导：填道号 → 可选设口令 → 选日界线/勾选示例数据 → 点「入道」→ 进入首页「修身」。

启动之后：

- 关闭窗口默认**最小化到托盘**（右下角印章图标），托盘菜单可重新打开或退出；
- 数据只存本机：开发模式在 `%APPDATA%\moyu-merit-book\`，想重来就删掉该目录再启动；
- 改前端代码会热重载；改主进程代码会自动重启应用。

## 二、两种运行方式

### 方式 A：开发模式（要改代码）

```powershell
npm run dev
```

见上文「快速开始」。适合开发与调试。

### 方式 B：直接运行打包版 exe（不改代码，无需 Node 环境）

向项目负责人要 `release\` 目录里的成品，或自行打包：

```powershell
npm run dist:win
```

产物与用法：

- `release\摸鱼功德簿 Setup 1.0.0.exe`：**安装版**，双击按向导安装，桌面与开始菜单出现「摸鱼功德簿」快捷方式；
- `release\摸鱼功德簿 1.0.0.exe`：**免安装版**（portable），双击直接运行；
- 免安装目录版：`release\win-unpacked\摸鱼功德簿.exe`。

打包版数据目录：`%APPDATA%\摸鱼功德簿\`。首次 `dist:win` 需要联网下载打包工具（NSIS / winCodeSign），先设镜像：

```powershell
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

> 若打包时报「创建符号链接特权」相关错误，以管理员身份运行一次 PowerShell 再打包，或在系统设置中开启「开发者模式」。

## 三、环境要求

| 项目 | 要求 | 自检命令 |
| --- | --- | --- |
| 操作系统 | Windows 10/11 x64（主力平台） | — |
| Node.js | ≥ 20（项目在 Node 24 上验证） | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | 任意近期版本 | `git --version` |

## 四、安装报错排查（按症状对号入座）

| 症状 | 原因 | 解法 |
| --- | --- | --- |
| `npm install` 报 `'node' 不是内部或外部命令` | npm 用 cmd 执行脚本时 PATH 异常 | 见 4.1 |
| `npm run dev` 报 `Error: Electron uninstall` | `node_modules/electron/path.txt` 缺失 | 运行 `scripts/fix-binaries.ps1` |
| `npm run test` 报 esbuild `The service was stopped` | esbuild 平台二进制缺失或版本错配 | 重跑 `npm install --ignore-scripts`，再运行 `scripts/fix-binaries.ps1` |
| `cmd /c node -v` 提示找不到 node，但 PowerShell 里正常 | 系统 PATH 存在大量重复条目（超长截断） | 见 4.1 第 3 条 |
| `npm install` 清理时报 `EBUSY` / `EPERM` | esbuild 服务进程或编辑器占用目录 | 关掉 VSCode 与残留 node 进程；删不掉先 `Rename-Item node_modules node_modules.bak` |
| `dist:win` 报「创建符号链接特权」 | 非管理员解压 winCodeSign 工具包 | 以管理员运行一次，或开启系统「开发者模式」 |

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

## 五、`fix-binaries.ps1` 做了什么

1. 检查 `node_modules/electron/dist/electron.exe`；缺失则按 `node_modules/electron/package.json` 的版本从镜像下载 zip 并解压；
2. 写入 `node_modules/electron/path.txt`（内容 `electron.exe`，**无换行**——electron-vite 靠它定位运行时，读取后不做 trim）；
3. 用 `node -p "require('electron')"` 自检，输出 exe 完整路径即成功。

## 六、校验命令（提交前请全跑一遍）

```powershell
npm run typecheck   # 主进程 + 渲染层 TypeScript，0 error
npm run test        # Vitest 全量单测
npm run build       # 生产构建，产出 out/
npm run lint:guard  # 色值 / 零网络 / 禁用文案 三项红线
npm run dist:win    # Windows NSIS + portable 安装包，产出 release\
```

## 七、项目约定速览

- 门禁五连未全绿不得宣称完成；提交信息用中文 conventional commits（如 `feat: 实现每日结算`）。
- 界面文案中文、代码标识符英文；文案红线清单见 `src/shared/constants.ts` 的 `FORBIDDEN_PHRASES`。
- 运行时零网络：不引入 UI 库 / 图表库 / CSS 框架 / 图标库 / dayjs / axios；图表手写 SVG。
- 计分、结算、判词只在主进程计算；渲染层只经 `window.moyu` 调用。
- 规则文件外置 `data/rules.json`，说明见 `docs/rules.md`；架构与验收见 `README.md` 与 `docs/ACCEPTANCE.md`。
