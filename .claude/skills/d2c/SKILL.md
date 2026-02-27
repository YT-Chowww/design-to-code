---
name: d2c
description: Main orchestrator for the Design-to-Code workflow. Converts a Figma design into Vue 3 + TypeScript code with visual verification. Takes a Figma URL and optional target directory as arguments.
---

# D2C — 主编排器

## 输入
- 参数格式：`<figma-url> [target-directory]`
- `figma-url`：Figma 设计稿链接（必需）
- `target-directory`：目标项目目录路径（可选，不提供则跳过合并步骤）

## 配置
- 最大迭代次数：3（可在 `.claude/rules/d2c-workflow.md` 中修改）
- 视觉验证通过阈值：90%

## 主流程

### 初始化

1. **解析参数**：
   - 提取 Figma URL 和目标目录路径
   - 验证 Figma URL 格式（应包含 `figma.com`）
   - 如果提供了目标目录，验证其存在

2. **输出流程概览**：
```
=== D2C: Design to Code ===
Figma URL: <url>
Target: <directory or "Preview only">
Max iterations: 3

Starting design-to-code conversion...
```

### Step 1/5: 提取设计信息

调用 `/d2c-extract` skill：
```
[Step 1/5] Extracting design information...
```

- 传入 Figma URL
- 获取结构化设计规格
- 如果失败，中止流程并报告错误

### Step 2/5: 生成 Vue 3 代码

调用 `/d2c-generate` skill：
```
[Step 2/5] Generating Vue 3 code...
```

- 传入设计规格（来自 Step 1）
- 生成 Vue 3 SFC 文件到 `templates/vite-preview/src/`

### Step 3/5: 代码校验

调用 `/d2c-validate` skill：
```
[Step 3/5] Validating code...
```

- TypeScript 检查
- ESLint 检查
- Vite 构建
- 启动开发服务器
- 如果校验失败且无法自动修复，报告错误但继续到验证步骤

### Step 4/5: 视觉验证（迭代循环）

进入迭代验证循环：

```
[Step 4/5] Visual verification (iteration 1/3)...
```

**循环逻辑**：
```
iteration = 1
MAX_ITERATIONS = 3

while iteration <= MAX_ITERATIONS:
    # 调用 /d2c-verify
    result = d2c-verify()

    if result.status == "PASSED":
        # 验证通过，退出循环
        print("✓ Visual verification passed (score: {result.score}%)")
        break

    if result.status == "SKIPPED":
        # Chrome MCP 不可用，跳过验证
        print("⚠ Visual verification skipped (Chrome DevTools MCP unavailable)")
        break

    if iteration == MAX_ITERATIONS:
        # 达到迭代上限
        print("⚠ Max iterations reached. Current score: {result.score}%")
        print("Deviation report:")
        print(result.deviation_report)
        print("")
        print("Please review the current state and provide manual guidance.")
        # 等待用户指导
        break

    # 验证未通过，进入下一次迭代
    print("✗ Verification failed (score: {result.score}%). Iterating...")
    iteration += 1

    # 调用 /d2c-generate 传入偏差报告
    print(f"[Step 4/5] Fixing deviations (iteration {iteration}/{MAX_ITERATIONS})...")
    d2c-generate(deviation_report=result.deviation_report)

    # 重新校验
    d2c-validate()
```

### Step 5/5: 合入项目代码

仅在以下条件满足时执行：
- 视觉验证通过（PASSED）或跳过（SKIPPED）
- 用户提供了目标目录路径

调用 `/d2c-merge` skill：
```
[Step 5/5] Merging into target project...
```

- 传入目标目录路径
- 执行代码合并
- 输出合并报告

如果未提供目标目录：
```
[Step 5/5] Skipped (no target directory specified)
Preview available at: http://localhost:5173
```

### 最终输出

```
=== D2C Complete ===

Summary:
- Components generated: 4 (Header, HeroSection, FeatureList, Footer)
- Iterations: 2/3
- Final score: 93%
- Files merged: 5

Generated files:
  ✓ src/components/Header.vue
  ✓ src/components/HeroSection.vue
  ✓ src/components/FeatureList.vue
  ✓ src/components/Footer.vue
  ✓ src/assets/styles/d2c-generated.css

Preview: http://localhost:5173
```

## 错误处理汇总

| 阶段 | 错误 | 处理 |
|------|------|------|
| 初始化 | Figma URL 格式无效 | 提示正确格式并中止 |
| Extract | Figma MCP 不可用 | 降级到手动输入 |
| Extract | 设计数据为空 | 提示检查 node-id 并中止 |
| Generate | 设计规格缺失 | 提示先完成 Extract |
| Validate | npm install 失败 | 报告错误，建议手动安装 |
| Validate | TypeScript 错误 | 自动修复，最多 2 次 |
| Verify | Chrome MCP 不可用 | 跳过视觉验证 |
| Verify | 迭代 3 次仍未通过 | 展示状态，请用户介入 |
| Merge | 目标目录无效 | 提示检查路径 |
| Merge | 文件冲突 | 提示用户确认 |

## 中止与恢复

- 任何步骤可以通过用户中断停止
- 已生成的代码保留在 `templates/vite-preview/src/` 中
- 可通过单独调用子 skill 继续中断的步骤
- 开发服务器可能需要手动停止：`lsof -i :5173` 然后 `kill <PID>`
