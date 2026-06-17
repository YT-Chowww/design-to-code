# 操作指南

## 初始化

在目标业务项目根目录运行：

```text
/d2c-init
```

初始化后检查：

- `.d2c/context/project-config.json`
- `.d2c/context/design-system.json`
- `.d2c/context/component-library.json`
- `.d2c/context/project-adapter.json`

如果需要给人补充说明，再同步更新对应 Markdown 镜像。

## 完整流程

```text
/d2c <figma-url> [target-directory]
```

示例：

```text
/d2c https://www.figma.com/design/abc123/MyDesign?node-id=1-100 /path/to/my-project
```

执行顺序：

```text
[Step 1/7] Extracting design information
[Step 2/7] Generating preview code
[Step 3/7] Validating preview code
[Step 4/7] Preview 视觉核验
[Step 5/7] Merging into target project
[Step 6/7] Validating target project
[Step 7/7] Target 视觉核验
```

每一步完成后都应更新 `.d2c/docs/sessions/<runId>/manifest.json`。

## 子 Skill

```text
/d2c-extract <figma-url>
/d2c-generate
/d2c-validate phase=preview
/d2c-verify phase=preview
/d2c-merge [target-directory]
/d2c-validate phase=target targetDirectory=<path>
/d2c-verify phase=target targetDirectory=<path>
```

单独运行子 skill 时，优先从 manifest 读取输入路径。缺少 manifest 时，应先补齐 runId/designId 和必要工件。

## 中断恢复

恢复中断 run 时，不从对话记忆猜测进度；先读取 `.d2c/docs/sessions/<runId>/manifest.json`，再用基线校验脚本推断下一步：

```bash
node scripts/check-baseline-manifest.mjs .d2c/docs/sessions/<runId>/manifest.json --next-step
```

恢复决策遵循 `docs/baseline-protocol.md`：

- extract 产物缺失：恢复 `d2c-extract`。
- generation log 缺失：恢复 `d2c-generate`。
- preview validation report 缺失：恢复 `d2c-validate phase=preview`。
- preview verify 失败且未达到迭代上限：带偏差报告回到 `d2c-generate`。
- preview verify 通过或跳过但 merge 未完成：恢复 `d2c-merge`。
- target validate 失败或降级：停止完成声明，先修复 target 校验。
- target verification report 缺失：恢复 `d2c-verify phase=target`。

本恢复逻辑先由 `docs/baseline-protocol.md` 固化；对应测试后续在统一测试建设中补齐。

## 关键检查

Extract 后：

- raw Figma JSON 存在且可解析。
- assets manifest 存在。
- normalized design 存在且包含 `components`、`requiredStyle`、`tokenCandidates`、`uiPatternCandidates`。

Generate 后：

- `.d2c/preview/src/` 有入口和组件文件。
- generation log 记录 `tokenHints`、`componentMappings`、`styleFit`。
- 图表候选要求契约评估时，generation log 记录候选组件、匹配/缺失契约、选择组件、option、adapter、静态数据状态和 fallback 原因。
- preview 样式使用 raw value 作为视觉还原基线。

Merge 后：

- merge report 列出所有新增/修改文件。
- `resolvedTokens` 记录采用项目表达或 fallback raw value 的原因。
- target validate / verify 的建议命令和 URL 已写回 manifest。

Target Validate：

- 默认从 merge report 的 `mergedFiles[].targetPath` 获取本次 changed-files 清单。
- 只校验本次新增或修改文件的类型、导入、样式引用和资源路径。
- 全项目 type-check / build 仅作为用户明确要求时的可选诊断；目标项目历史错误不得降级本次 changed-files 结果。

## P0 运行检查

复合示例在 normalized design 和 registry 中记录 `scopeAssessment` 与 `relatedNodes`。存在 `missingRequirements` 时不得升级为 `verified`。

Chrome MCP viewport 截图转换为 canonical diff：

```bash
node scripts/capture-canonical-screenshot.mjs \
  --input=<viewport.png> \
  --reference=<reference.png> \
  --rect=<x,y,width,height> \
  --dpr=<number> \
  --actual=<actual.png> \
  --diff=<diff.png>
```

复合图表最多按相同 selector 顺序执行三轮 canonical diff。第三轮仍超出 `pixelRatio <= 0.02` 时停止在 `WAIT_FOR_USER`，不进入 merge 或 target verify。

merge 后检查写入边界，最终清理本轮服务：

```bash
node scripts/check-write-boundary.mjs --manifest=<manifest.json> --root=<target-root>
node scripts/cleanup-d2c-servers.mjs <manifest.json>
```

## 同步到本机工具

```bash
bash scripts/sync-claude-skills.sh
bash scripts/sync-codex-skills.sh
```

同步脚本使用 symlink，便于本仓库更新后本机 skills 自动看到最新内容。
