---
name: d2c
description: Main orchestrator for the Design-to-Code workflow. Converts a Figma design into production-ready frontend code with visual verification. Auto-detects the target project's framework (Vue 3, React, Svelte, Angular, or Vanilla). Takes a Figma URL and optional target directory as arguments.
---

# D2C — 主编排器

## 输入
- 参数格式：`<figma-url> [target-directory]`
- `figma-url`：Figma 设计稿链接（必需）
- `target-directory`：目标项目目录路径（可选，不提供则默认合入当前工作目录 CWD）

## 配置
- 最大迭代次数：3
- 视觉验证通过阈值：90%

## 代码质量规则
- 不允许使用 `any` 类型（除非降级处理）
- 不允许内联样式（必须使用框架对应的样式隔离方案）
- 设计中超过 5 个独立区域时，必须分解为子组件
- 迭代修改时做针对性修改，不要全量重写
- TypeScript 错误修复上限：2 次（超过后降级处理）

## MCP 降级策略
- Figma MCP 不可用：提示用户手动提供设计信息（截图 + 描述）
- Chrome DevTools MCP 不可用：跳过视觉验证，仅做静态校验，输出警告

## 主流程

### Pre-flight Check: 初始化检查

检查 `.d2c/` 目录是否存在且结构完整：

```bash
ls .d2c/preview/package.json
ls .d2c/context/design-system.md
```

如果 `.d2c/` 不存在或结构不完整：
- 自动调用 `/d2c-init` 初始化工作目录
- 等待初始化完成后继续

### 初始化

1. **解析参数**：
   - 提取 Figma URL 和目标目录路径
   - 验证 Figma URL 格式（应包含 `figma.com`）
   - 目标目录：如果提供了路径，验证其存在；如果未提供，默认为 CWD

2. **读取技术栈**：
   - 读取 `.d2c/context/project-config.md` 中的「检测到的技术栈」
   - 提取 `framework` 字段（将显示在输出中）

3. **输出流程概览**：
```
=== D2C: Design to Code ===
Figma URL: <url>
Target: <directory or CWD>
Framework: <framework>
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

### Step 2/5: 生成代码

调用 `/d2c-generate` skill：
```
[Step 2/5] Generating <framework> code...
```

- 传入设计规格（来自 Step 1）
- d2c-generate 会读取 project-config.md 自动适配框架
- 生成组件文件到 `.d2c/preview/src/`

### Step 3/5: 代码校验

调用 `/d2c-validate` skill：
```
[Step 3/5] Validating code...
```

- 类型检查（按框架适配命令）
- ESLint 检查
- 构建验证
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

仅在视觉验证通过（PASSED）或跳过（SKIPPED）时执行。

调用 `/d2c-merge` skill：
```
[Step 5/5] Merging into project...
```

- 如果提供了目标目录路径，传入该路径
- 如果未提供目标目录，默认合入 CWD（当前业务项目）
- 执行代码合并
- 输出合并报告

### 最终输出

```
=== D2C Complete ===

Summary:
- Framework: <framework>
- Components generated: 4 (Header, HeroSection, FeatureList, Footer)
- Iterations: 2/3
- Final score: 93%
- Files merged: 5

Generated files:
  ✓ src/components/Header.<ext>
  ✓ src/components/HeroSection.<ext>
  ✓ src/components/FeatureList.<ext>
  ✓ src/components/Footer.<ext>
  ✓ src/assets/styles/d2c-generated.css

Preview: http://localhost:5173
```

## 文档记录

每次完整 D2C 流程执行完成后，将整体会话记录保存到 `.d2c/docs/sessions/` 目录。此文档汇总所有步骤的执行概要，串联各子 skill 的产出。

**文件命名**：`<YYYY-MM-DD>-<design-name>.md`
- 日期使用当天日期
- `<design-name>` 从 Figma 设计稿名称或 Frame 名称派生，使用 kebab-case

**文档内容模板**：

```markdown
# D2C 会话记录：<设计稿名称>

## 基本信息
- **日期**：<YYYY-MM-DD>
- **Figma URL**：<url>
- **目标目录**：<target-directory or CWD>
- **技术栈**：<framework> + <language> + <cssStrategy>
- **最大迭代次数**：3
- **视觉验证阈值**：90%

## 执行概要
| 步骤 | Skill | 状态 | 耗时 | 备注 |
|------|-------|------|------|------|
| Pre-flight | — | OK/WARN | — | <.d2c/ 状态> |
| 1/5 Extract | d2c-extract | OK/ERROR | — | <N 个组件, N 个资源> |
| 2/5 Generate | d2c-generate | OK | — | <N 个文件生成> |
| 3/5 Validate | d2c-validate | OK/WARN | — | <校验结果摘要> |
| 4/5 Verify | d2c-verify | PASSED/FAILED/SKIPPED | — | <得分 / 迭代次数> |
| 5/5 Merge | d2c-merge | OK/SKIPPED | — | <N 个文件合并> |

## 组件清单
| 组件名 | 文件路径 | 说明 |
|--------|----------|------|
| <PascalCase> | src/components/<name>.<ext> | <组件职责> |

## 迭代历史
| 迭代 | 操作 | 验证得分 | 关键修改 |
|------|------|----------|----------|
| 1 | 首次生成 + 验证 | <N>% | — |
| 2 | 偏差修复 + 重新验证 | <N>% | <修改摘要> |

## 最终统计
- **框架**：<framework>
- **组件数量**：<N>
- **迭代次数**：<N/3>
- **最终得分**：<N>%
- **合并文件数**：<N>
- **预览地址**：http://localhost:5173

## 关联文档
- 设计规格：[.d2c/docs/design-specs/<file>](../design-specs/<file>)
- 生成记录：[.d2c/docs/generation-logs/<file>](../generation-logs/<file>)
- 校验报告：[.d2c/docs/validation-reports/<file>](../validation-reports/<file>)
- 验证报告：[.d2c/docs/verification-reports/<file>](../verification-reports/<file>)
- 合并报告：[.d2c/docs/merge-reports/<file>](../merge-reports/<file>)
```

**写入时机**：在最终输出（`=== D2C Complete ===`）之后，使用 Write 工具将文档写入 `.d2c/docs/sessions/<YYYY-MM-DD>-<design-name>.md`。

确保先检查 `.d2c/docs/sessions/` 目录存在（如不存在则创建）。

## 错误处理汇总

| 阶段 | 错误 | 处理 |
|------|------|------|
| Pre-flight | `.d2c/` 不存在 | 自动调用 `/d2c-init` |
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
- 已生成的代码保留在 `.d2c/preview/src/` 中
- 可通过单独调用子 skill 继续中断的步骤
- 开发服务器可能需要手动停止：`lsof -i :5173` 然后 `kill <PID>`
