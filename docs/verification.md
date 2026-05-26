# 验证方案

## 单元验证

### d2c-extract

```text
/d2c-extract <figma-url>
```

预期：

- 写入 raw Figma JSON。
- 写入 assets manifest。
- 写入 normalized design JSON。
- 写入人工可读 design spec。
- manifest 中 `status.extract` 和工件路径同步更新。

### d2c-generate

```text
/d2c-generate
```

预期：

- 从 manifest 读取 normalized design。
- 生成 Vue 3 或 React preview 代码。
- generation log 记录 `tokenHints`、`componentMappings`、`styleFit`。
- preview 样式优先使用 Figma raw value。

### d2c-validate

```text
/d2c-validate phase=preview
/d2c-validate phase=target targetDirectory=<path>
```

预期：

- preview 阶段完成 type-check、可用 lint、build 和 dev server。
- target 阶段使用目标项目真实命令完成校验。
- 报告写入 `.d2c/docs/validation-reports/<designId>/<runId>-<phase>.md`。

### d2c-verify

```text
/d2c-verify phase=preview
/d2c-verify phase=target targetDirectory=<path>
```

预期：

- Chrome DevTools MCP 可用时截图并评分。
- preview 失败时输出偏差报告供 generate 迭代。
- target 失败时优先检查 `resolvedTokens`、业务组件样式覆盖、资源路径和全局样式优先级。
- MCP 不可用时写 `SKIPPED` 报告。

### d2c-merge

```text
/d2c-merge <target-directory>
```

预期：

- 只在 preview verify 为 `PASSED` 或 `SKIPPED` 后执行。
- 合入文件路径、导入适配、资源迁移、token 解析完整记录。
- merge report 写入 manifest。

## 端到端验证

简单组件：

```text
/d2c <simple-figma-url> <target-dir>
```

检查：

- 7 个阶段状态清晰。
- manifest 可解析且路径存在。
- preview 与 target 报告成对出现，或明确标记 `SKIPPED`。
- target validate 失败时不会宣称完成。

复杂页面：

- 检查组件拆分是否合理。
- 检查 `styleFit` 低分区域是否在 verify 中重点复核。
- 检查 token fallback 是否有原因。
- 检查 target 视觉与 preview 视觉差异是否被记录。

## 错误处理验证

| 测试场景 | 操作 | 预期行为 |
|----------|------|----------|
| Figma MCP 不可用 | 断开 MCP 后运行 extract | 手动输入模式，raw 工件标记来源 |
| Chrome MCP 不可用 | 断开 MCP 后运行 verify | verify 报告 `SKIPPED` 并记录原因 |
| Token 候选不可靠 | 设置项目 token 值与 raw value 不一致 | merge 保留 raw value 并记录 fallbackReason |
| Target 构建失败 | 合入后运行 target validate | manifest 标记失败，最终状态不写完成 |
