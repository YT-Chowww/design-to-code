---
name: d2c-verify
description: Visually verify generated code by comparing a browser screenshot against the original Figma design. Uses Chrome DevTools MCP to capture screenshots and multimodal analysis for comparison. Use after d2c-validate has confirmed the code builds and runs.
---

# D2C Verify — 视觉验证

## 输入
- Vite 开发服务器运行中（`http://localhost:5173`）
- 原始 Figma 设计数据（来自 `d2c-extract` 的上下文）

## 流程

### Step 1: 检查 Chrome DevTools MCP 可用性

尝试调用 Chrome DevTools MCP。如果不可用：
- 输出警告：`⚠ Chrome DevTools MCP 不可用，跳过视觉验证。仅依赖静态校验结果。`
- 建议用户手动打开 `http://localhost:5173` 在浏览器中检查
- 返回结果标记为 `SKIPPED`，允许流程继续

### Step 2: 获取设计稿参考

从对话上下文中获取设计规格的尺寸信息：
- 设计稿宽度和高度
- 如果设计规格中没有明确尺寸，默认使用 1440x900（桌面端）

同时，获取 Figma 设计稿的截图作为对比参考：
- 如果有通过 `download_figma_images` 下载的设计图片，使用该图片
- 如果没有，尝试通过 Figma MCP 获取设计稿截图
- 如果都不可用，依赖对话上下文中的设计规格文字描述进行对比

### Step 3: 截取页面截图

使用 Chrome DevTools MCP 执行以下操作：

1. **调整浏览器窗口尺寸**：
   - 调用 `resize_page` 设置为设计稿尺寸（宽 x 高）

2. **导航到预览页面**：
   - 调用 `navigate_page` 访问 `http://localhost:5173`
   - 等待页面加载完成

3. **截取页面截图**：
   - 调用 `take_screenshot` 截取全页面截图

### Step 4: 多模态对比分析

将截图与设计稿进行视觉对比，逐项评估以下维度：

#### 4.1 布局准确性（权重 30%）
- 整体布局结构是否一致（flex/grid 方向、排列）
- 元素位置是否正确（顶部、居中、底部对齐）
- 元素间距是否匹配（gap、margin、padding）
- 响应式行为是否合理

#### 4.2 字体排版（权重 25%）
- 字体大小是否匹配
- 字重是否正确（normal、medium、bold）
- 行高是否合理
- 文字颜色是否正确
- 文字对齐方式是否一致

#### 4.3 颜色一致性（权重 25%）
- 背景颜色是否匹配
- 边框颜色是否正确
- 按钮/链接颜色是否一致
- 渐变色是否正确（如有）

#### 4.4 组件渲染（权重 20%）
- 所有组件是否正确渲染（无白屏、无报错）
- 圆角是否匹配
- 阴影效果是否正确
- 图片/图标是否正确显示
- 边框样式是否正确

### Step 5: 评分与判定

根据以上维度综合评分（0-100%）：

**评分规则**：
- 每个维度在自身范围内打分（0-100%）
- 综合分 = 布局×0.30 + 排版×0.25 + 颜色×0.25 + 组件×0.20
- **Pass**：综合分 ≥ 90%
- **Fail**：综合分 < 90%

### Step 6: 输出结果

#### Pass 输出格式：
```
=== D2C Visual Verification ===
Status: ✓ PASSED

Score: 93%
- Layout accuracy:  95% (weight 30%)
- Typography:       92% (weight 25%)
- Color consistency: 90% (weight 25%)
- Component render:  96% (weight 20%)

Visual verification passed. Ready for merge.
```

#### Fail 输出格式：
```
=== D2C Visual Verification ===
Status: ✗ FAILED

Score: 78%
- Layout accuracy:  85% (weight 30%)
- Typography:       70% (weight 25%)
- Color consistency: 75% (weight 25%)
- Component render:  82% (weight 20%)

=== Deviation Report ===

### Layout Issues
1. [Header] 顶部导航栏高度偏大，设计稿 64px，实际约 80px
   → 修改 Header.vue 的 `.header` 高度为 64px

2. [HeroSection] 左右内边距不足，设计稿 padding: 0 120px，实际约 padding: 0 40px
   → 修改 HeroSection.vue 的 `.hero` padding

### Typography Issues
1. [Header] Logo 文字字重应为 700，当前为 400
   → 修改 `.logo` 的 font-weight

### Color Issues
1. [HeroSection] 标题文字颜色应为 #1F2937，当前为 #000000
   → 修改 `.hero-title` 的 color 为 var(--color-text-primary)

### Component Issues
1. [Footer] 底部链接图标未正确渲染
   → 检查图标资源路径

=== Suggested Fixes ===
以上偏差将在下一次迭代中修正。
```

## 文档记录

每次执行完成后，将视觉验证结果记录到 `.d2c/docs/verification-reports/` 目录。

**文件命名**：`<YYYY-MM-DD>-<design-name>.md`
- 日期使用当天日期
- `<design-name>` 从当前任务的设计稿名称派生，使用 kebab-case
- 同一设计的多次验证（迭代）更新同一文件（追加记录）

**文档内容模板**：

```markdown
# 视觉验证报告：<设计稿名称>

## 基本信息
- **日期**：<YYYY-MM-DD>
- **Chrome DevTools MCP**：<可用/不可用（SKIPPED）>
- **设计稿参考**：<下载图片/MCP 截图/文字描述>
- **设计稿尺寸**：<宽 x 高>
- **预览地址**：http://localhost:5173

## 验证结果（第 N 次迭代）

### 评分
| 维度 | 得分 | 权重 | 加权得分 |
|------|------|------|----------|
| 布局准确性 | <N>% | 30% | <N>% |
| 字体排版 | <N>% | 25% | <N>% |
| 颜色一致性 | <N>% | 25% | <N>% |
| 组件渲染 | <N>% | 20% | <N>% |
| **综合得分** | | | **<N>%** |

### 判定
- **状态**：PASSED / FAILED / SKIPPED
- **通过阈值**：90%

### 偏差报告（FAILED 时记录）

#### 布局问题
1. [<组件>] <偏差描述>
   → Fix: <修复建议>

#### 字体问题
1. [<组件>] <偏差描述>
   → Fix: <修复建议>

#### 颜色问题
1. [<组件>] <偏差描述>
   → Fix: <修复建议>

#### 组件问题
1. [<组件>] <偏差描述>
   → Fix: <修复建议>
```

**写入时机**：在 Step 6 输出结果后，使用 Write 工具将文档写入 `.d2c/docs/verification-reports/<YYYY-MM-DD>-<design-name>.md`。多次迭代验证时，读取已有文件并追加「验证结果（第 N 次迭代）」章节。

确保先检查 `.d2c/docs/verification-reports/` 目录存在（如不存在则创建）。

## 偏差报告规范

偏差报告必须包含：
1. **具体组件**：标明哪个组件有问题
2. **偏差描述**：描述设计稿预期值和实际值
3. **修复建议**：具体到文件名、CSS 类名、属性名
4. **优先级**：布局问题 > 颜色问题 > 字体问题 > 其他

此偏差报告将传递给 `d2c-generate` 进行针对性修改。

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| Chrome MCP 不可用 | 跳过验证，标记 SKIPPED |
| 页面加载失败 | 检查 dev server 是否运行，提示重新启动 |
| 截图为空白 | 检查页面是否有渲染错误，查看控制台日志 |
| 无设计稿参考图 | 基于设计规格文字描述进行对比 |
