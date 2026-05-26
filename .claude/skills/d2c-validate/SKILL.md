---
name: d2c-validate
description: Validate generated frontend code in preview or target-project phase with type checking, optional linting, build verification, and runtime startup. Adapts validation commands to the detected framework and tooling.
---

# D2C Validate — 代码校验与运行

## 输入
- `phase`：`preview` 或 `target`，默认为 `preview`
- `targetDirectory`：目标项目目录，`phase=target` 时必需；未提供时使用 CWD
- 已生成的代码（preview 阶段位于 `.d2c/preview/src/`，target 阶段位于合入后的目标项目目录）
- `.d2c/context/project-config.json`
- `.d2c/docs/sessions/<runId>/manifest.json`

## 目标

`phase=preview` 保证 preview 工程满足“可运行 + 可校验”：
- `type-check`：尽量执行
- `build`：必须执行
- `lint`：存在可用 linter 时执行
- `format`：不在本阶段强制执行

`phase=target` 保证合入后的目标项目满足真实工程约束：
- 使用目标项目实际命令、依赖、别名、样式构建和资源处理规则
- 覆盖 token 适配、业务组件替换、路径迁移后的类型和构建问题
- 目标项目校验失败时，最终 D2C 状态保持未完成

## 命令发现协议

Validate 阶段必须先生成一份命令矩阵，再执行具体检查。命令矩阵来自真实项目事实，不从对话记忆猜测。

### package manager 选择

按以下顺序选择包管理器：

| 证据 | packageManager |
|------|----------------|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `package-lock.json` | `npm` |
| `.d2c/context/project-config.json.packageManager` | context 值 |
| 无证据 | `npm` |

执行脚本时使用对应命令：

| packageManager | script 命令 |
|----------------|-------------|
| `npm` | `npm run <script>` |
| `pnpm` | `pnpm <script>` |
| `yarn` | `yarn <script>` |

### 命令来源优先级

`phase=preview`：
1. `.d2c/preview/package.json scripts`
2. `.d2c/context/project-config.json.tooling`
3. 框架默认 fallback

`phase=target`：
1. `<targetDirectory>/package.json scripts`
2. `.d2c/context/project-adapter.json.validationCommands`
3. `.d2c/context/project-config.json.tooling`
4. 框架默认 fallback

每个检查项必须记录 `source`：

| source | 含义 |
|--------|------|
| `package-script` | 来自真实 `package.json scripts` |
| `project-adapter` | 来自 `project-adapter.json.validationCommands` |
| `project-config` | 来自 `project-config.json.tooling` |
| `framework-default` | 来自 validate skill 默认矩阵 |
| `missing` | 未找到可执行命令，状态必须为 `SKIPPED` |

### 检查矩阵

| 检查项 | preview 选择规则 | target 选择规则 | 缺失处理 |
|--------|------------------|------------------|----------|
| `typeCheck` | 优先 `type-check` / `typecheck` / `tsc`；TypeScript 无脚本时用框架默认命令 | 优先目标项目真实脚本，再读 adapter/config，再 fallback | JavaScript 项目 `SKIPPED`；TypeScript 项目 fallback |
| `lint` | 优先 `lint` / `eslint`；无 linter 配置时跳过 | 优先目标项目真实 `lint`，再读 adapter/config | `SKIPPED` 并记录 reason |
| `format` | 默认不强制，存在 `format:check` / `format` 才执行 | 存在真实脚本才执行 | `SKIPPED` 并记录 reason |
| `stylelint` | 存在 `stylelint` / `lint:style` 才执行 | 存在真实脚本才执行 | `SKIPPED` 并记录 reason |
| `build` | 优先 `build`；无脚本时 Vite fallback | 优先 `build` / `build:test` / `dev:build` / `build:prod` | target 缺失时 `FAILED` |
| `devServer` | 优先 `dev`；无脚本时 Vite fallback | 优先 `start` / `dev` / `serve` | `NEEDS_MANUAL_START` |

覆盖 Vite、Umi、Next、Webpack 的默认 fallback：

| buildTool | typeCheck fallback | build fallback | dev fallback |
|-----------|--------------------|----------------|--------------|
| `vite` | Vue: `npx vue-tsc --noEmit`；React: `npx tsc --noEmit` | `npx vite build` | `npx vite --host 0.0.0.0 --port <port>` |
| `umi` | `npx tsc --noEmit` | `npx umi build` | `npx umi dev` |
| `next` | `npx tsc --noEmit` | `npx next build` | `npx next dev -p <port>` |
| `webpack` | `npx tsc --noEmit` | `npx webpack --mode production` | `npx webpack serve --port <port>` |

### 状态规则

- `lint`、`format`、`stylelint` 没有可用命令时必须写 `SKIPPED`，并记录 `reason`。
- `target build` 没有可用命令或执行失败时，`overallStatus` 不得为 `PASSED`。
- `target typeCheck` 失败时，`overallStatus` 必须为 `FAILED` 或 `DEGRADED`。
- `target` 阶段任一必需检查为 `FAILED` 时，不得继续声明整体 D2C 流程完成。
- 所有执行过的命令都必须记录 `command`、`source`、`status` 和摘要输出路径或摘要文本。

## 流程

### Step 0: 读取配置

读取 `phase`。`phase=preview` 时优先读取 `.d2c/context/project-config.json`，回退到 `.md`；`phase=target` 时优先读取目标项目真实配置，再用 `.d2c/context/project-config.json` 补充缺失字段。

提取：
- `framework`
- `language`
- `buildTool`
- `cssStrategy`
- `tooling.linter`
- `tooling.typeCheck`
- `tooling.build`
- `tooling.devServer`
- `previewPolicy`

如果文件不存在或未检测到，使用默认值 `vue3 + typescript + vite`。

### Step 0.5: 确保待校验项目存在

`phase=preview` 检查：

检查：

```bash
ls .d2c/preview/package.json
```

如果不存在：
- 回调 `d2c-init` 中定义的 preview 模板逻辑
- 只创建最小预览工程，不复制目标项目完整工具链

`phase=target` 检查：

```bash
ls <target-directory>/package.json
ls <target-directory>/src
```

如果目标项目结构缺失：
- 写入 `FAILED` 校验报告
- 停止后续 target verify

### Step 1: 确保项目依赖就绪

`phase=preview` 检查预览项目依赖是否已安装：

```bash
ls .d2c/preview/node_modules
```

如果 `node_modules` 不存在：

```bash
cd .d2c/preview && npm install
```

`phase=target` 检查目标项目依赖是否已安装：

```bash
ls <target-directory>/node_modules
```

如果缺失，按目标项目包管理器安装依赖。包管理器优先级：lockfile > project-config > npm。

### Step 2: 类型检查

根据框架和语言选择对应命令：

| 框架 | 命令 | 条件 |
|------|------|------|
| vue3 | `cd .d2c/preview && npx vue-tsc --noEmit` | language = typescript |
| react | `cd .d2c/preview && npx tsc --noEmit` | language = typescript |

`phase=target` 时优先使用目标项目配置的 type-check 命令；缺失时按框架回退：

| 框架 | 回退命令 | 条件 |
|------|----------|------|
| vue3 | `cd <target-directory> && npx vue-tsc --noEmit` | language = typescript |
| react | `cd <target-directory> && npx tsc --noEmit` | language = typescript |

如果 `language = javascript`，跳过类型检查。

**如果失败**：
1. 分析错误信息
2. 修复错误（preview 阶段修改生成组件，target 阶段修改合入后的目标文件）
3. 重新运行检查
4. 如果修复 2 次仍然失败：
   - 添加 `@ts-ignore` 或等价降级
   - 写入 TODO 说明
   - 继续后续步骤，并标记为 `DEGRADED`

### Step 3: 可选 lint 检查

根据 `project-config.json.tooling.linter` 判断：

- `name = none` 或命令为空：跳过，状态记为 `SKIPPED`
- `phase=preview` 执行 preview 可用的 lint 命令
- `phase=target` 执行目标项目真实 lint 命令

推荐命令：

| 框架 | 命令 |
|------|------|
| vue3 | `cd .d2c/preview && npx eslint src/ --ext .vue,.ts,.tsx` |
| react | `cd .d2c/preview && npx eslint src/ --ext .tsx,.ts,.jsx,.js` |

**如果失败**：
1. 追加 `--fix` 尝试自动修复
2. 手动修复剩余问题
3. 若是 preview 与目标项目规则冲突，允许局部禁用并记录原因

### Step 4: 构建检查

`phase=preview` 使用 preview 构建命令：

| 框架 | 命令 |
|------|------|
| vue3 | `cd .d2c/preview && npx vite build` |
| react | `cd .d2c/preview && npx vite build` |

`phase=target` 优先执行目标项目配置的 build 命令；缺失时读取 `package.json scripts`，按 `build`、`build:test`、`dev:build` 的顺序选择可用命令。

如果失败：
1. 分析构建错误
2. 修复问题并重新构建
3. 如需额外依赖，安装缺失依赖

### Step 5: 启动开发服务器

`phase=preview` 使用 preview dev server：

检查端口 5173：

```bash
lsof -i :5173
```

如被占用，先停止已有进程。然后启动：

| 框架 | 命令 |
|------|------|
| vue3 / react | `cd .d2c/preview && npx vite --port 5173 &` |

等待输出中出现 `Local:` URL。

`phase=target` 使用目标项目实际启动命令：
- 优先读取 `project-config.json.tooling.devServer.command`
- 其次读取 `package.json scripts` 中的 `start`、`dev`、`serve`
- 记录实际访问地址；无法自动确定时写入 `NEEDS_MANUAL_START`

### Step 6: 写回会话工件

将校验结果记录到：

```text
.d2c/docs/validation-reports/<designId>/<runId>-<phase>.md
.d2c/docs/validation-reports/<designId>/<runId>-<phase>.json
```

并将以下信息写回 `manifest.json`：
- `artifacts.previewValidationReport` 或 `artifacts.targetValidationReport`
- `artifacts.previewValidationReportJson` 或 `artifacts.targetValidationReportJson`
- `status.previewValidate` 或 `status.targetValidate`
- `previewUrl` 或 `targetUrl`

JSON 报告最小结构：

```json
{
  "designId": "<designId>",
  "runId": "<runId>",
  "phase": "preview",
  "targetDirectory": ".d2c/preview",
  "framework": "vue3",
  "language": "typescript",
  "buildTool": "vite",
  "packageManager": "npm",
  "commandMatrix": {
    "typeCheck": { "command": "npm run type-check", "source": "package-script" },
    "lint": { "command": "npm run lint", "source": "package-script" },
    "format": { "source": "missing", "reason": "No format script configured" },
    "stylelint": { "source": "missing", "reason": "No stylelint script configured" },
    "build": { "command": "npm run build", "source": "package-script" },
    "devServer": { "command": "npm run dev", "source": "package-script" }
  },
  "checks": {
    "typeCheck": { "status": "PASSED", "command": "npm run type-check", "source": "package-script" },
    "lint": { "status": "PASSED", "command": "npm run lint", "source": "package-script" },
    "format": { "status": "SKIPPED", "source": "missing", "reason": "No format script configured" },
    "stylelint": { "status": "SKIPPED", "source": "missing", "reason": "No stylelint script configured" },
    "build": { "status": "PASSED", "command": "npm run build", "source": "package-script" },
    "devServer": { "status": "Running", "command": "npm run dev", "source": "package-script", "url": "http://localhost:5173" }
  },
  "overallStatus": "PASSED"
}
```

生成后运行：

```bash
node scripts/check-validate-report.mjs .d2c/docs/validation-reports/<designId>/<runId>-<phase>.json
```

## 文档模板

```markdown
# 校验报告：<设计稿名称>

## 基本信息
- **Run ID**：<runId>
- **Design ID**：<designId>
- **技术栈**：<framework> + <language> + <cssStrategy>
- **校验阶段**：preview / target
- **项目目录**：<.d2c/preview or target-directory>
- **项目状态**：<已存在 / 自动创建 / 合入后>
- **依赖安装**：<已就绪 / 重新安装>

## 类型检查
- **状态**：PASSED / DEGRADED / SKIPPED
- **检查命令**：<实际命令>
- **错误数量**：<N>

## Lint 检查
- **状态**：PASSED / PARTIAL / SKIPPED
- **Linter**：<name>
- **执行命令**：<实际命令>
- **剩余问题**：<摘要>

## 构建检查
- **状态**：PASSED / FAILED
- **构建命令**：<实际命令>

## 运行服务
- **状态**：Running / Failed / NEEDS_MANUAL_START
- **地址**：<previewUrl or targetUrl>

## 综合结果
- Type check: <PASSED/DEGRADED/SKIPPED>
- Lint: <PASSED/PARTIAL/SKIPPED>
- Build: <PASSED/FAILED>
- Runtime server: <Running/Failed/NEEDS_MANUAL_START>
```

## 错误处理

| 错误 | 处理方式 |
|------|----------|
| `.d2c/preview/` 不存在 | 自动创建预览项目 |
| `node_modules` 不存在 | 运行 `npm install` |
| 类型错误修复 2 次仍失败 | 添加降级注释并记录 TODO |
| linter 未配置 | 跳过 lint 检查 |
| 构建失败（依赖缺失） | 安装缺失依赖 |
| 端口 5173 被占用 | 停止占用进程后重新启动 |
| `npm install` 失败 | 报告错误，建议用户手动安装 |
