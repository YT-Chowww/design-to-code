# design-to-code

D2C 是一组 Claude Code / Codex 可用的 Design-to-Code skills，用于把 Figma 设计稿转换为 Vue 3 或 React 前端代码。新版流程以文件工件为中心：每次运行都会生成 `runId`、`designId`、`manifest.json`、标准化设计 JSON、生成日志、校验报告、视觉验证报告和合并报告。

## 安装

在本仓库内可以用脚本把 skills 链接到本机：

```bash
bash scripts/sync-claude-skills.sh
bash scripts/sync-codex-skills.sh
```

也可以手动复制到业务项目：

```bash
mkdir -p .claude/skills
cp -r /path/to/design-to-code/.claude/skills/d2c* .claude/skills/
```

## 初始化

在业务项目根目录运行：

```text
/d2c-init
```

初始化会创建 `.d2c/`：

```text
.d2c/
├── preview/               # Vite 预览项目
├── context/               # JSON 优先的项目上下文
│   ├── project-config.json
│   ├── design-system.json
│   ├── component-library.json
│   ├── project-adapter.json
│   ├── project-config.md
│   ├── design-system.md
│   └── component-library.md
├── assets/                # Figma 图片资源
└── docs/                  # 每次运行的工件和报告
    ├── reference/
    ├── design-specs/
    ├── generation-logs/
    ├── validation-reports/
    ├── verification-reports/
    ├── merge-reports/
    └── sessions/
```

机器读取以 `.json` 为准，`.md` 文件用于人工说明和备注。

## 使用方式

完整流程：

```text
/d2c https://www.figma.com/design/xxxxx/MyDesign?node-id=1-100
```

指定目标目录：

```text
/d2c https://www.figma.com/design/xxxxx/MyDesign?node-id=1-100 /path/to/project
```

流程阶段：

```text
1. 初始化 manifest
2. Extract：raw Figma、assets、normalized design、design spec
3. Generate：preview 代码、tokenHints、componentMappings、styleFit
4. Preview Validate：类型、lint、构建、预览服务
5. Preview Verify：截图对比和迭代修正
6. Merge：合入目标项目，解析 resolvedTokens
7. Target Validate / Target Verify：合入后的真实校验和视觉复核
```

单独调用子 skill：

```text
/d2c-extract <figma-url>
/d2c-generate
/d2c-validate phase=preview
/d2c-verify phase=preview
/d2c-merge [/path/to/project]
/d2c-validate phase=target
/d2c-verify phase=target
```

## MCP 配置

- Figma MCP：用于读取设计数据和下载资源。不可用时进入手动输入模式。
- Chrome DevTools MCP：用于视觉验证。不可用时 verify 标记为 `SKIPPED`，并在报告中记录人工检查入口。

## 关键工件

- `.d2c/docs/sessions/<runId>/manifest.json`：整次运行的机器索引。
- `.d2c/docs/design-specs/<designId>/<runId>-normalized.json`：代码生成主输入。
- `.d2c/docs/generation-logs/<designId>/<runId>.md`：生成决策、token hints、组件映射和 style fit。
- `.d2c/docs/merge-reports/<designId>/<runId>.md`：目标项目合并、token 解析和文件清单。

## 测试建议

先用简单卡片或按钮设计跑 `/d2c`，确认 manifest、normalized design、preview build、preview verify 都能生成，再测试复杂页面和 target merge。
