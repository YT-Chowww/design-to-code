# 验证方案

## 单元验证

逐个 skill 单独调用测试，确保各模块独立可用。

### d2c-extract 验证
```bash
/d2c-extract <figma-url>
```
**预期结果**：
- 成功调用 Figma MCP 获取数据
- 输出包含：组件层级、布局结构、颜色/字体/间距值、图片资源列表
- 交叉引用 context/ 文件映射 token
- 无 MCP 时给出降级提示

### d2c-generate 验证
**前置**：有设计规格数据（手动提供或 extract 产出）
```bash
/d2c-generate
```
**预期结果**：
- 生成 `.vue` SFC 文件到 `templates/vite-preview/src/`
- 文件使用 `<script setup lang="ts">` 语法
- 包含 TypeScript 接口定义
- Scoped CSS 样式
- 文件结构合理（组件拆分、命名规范）

### d2c-validate 验证
**前置**：有生成的 Vue 代码
```bash
/d2c-validate
```
**预期结果**：
- TypeScript 检查通过（或报告具体错误）
- ESLint 检查通过（或报告具体问题）
- Vite 构建成功
- 开发服务器启动并可访问

### d2c-verify 验证
**前置**：Vite 开发服务器运行中
```bash
/d2c-verify
```
**预期结果**：
- Chrome DevTools MCP 成功截图
- 输出匹配度评分（0-100%）
- 偏差项有具体描述和修改建议
- 无 Chrome MCP 时给出降级提示

### d2c-merge 验证
**前置**：有通过验证的代码 + 目标项目
```bash
/d2c-merge <target-directory>
```
**预期结果**：
- 文件正确放置到目标目录
- import 路径已适配
- 目标项目 lint 通过

## 端到端验证

### 简单组件测试
用一个简单的 Figma 组件（如单个按钮或卡片）测试完整流程：
```bash
/d2c <simple-figma-url> <target-dir>
```
**检查项**：
- 流程是否完整执行（5 个步骤）
- 生成代码是否可运行
- 视觉还原度是否 ≥90%
- 合入目标项目是否正确

### 复杂页面测试
用包含多个组件的完整页面测试：
```bash
/d2c <complex-figma-url> <target-dir>
```
**检查项**：
- 组件是否正确拆分
- 组件间布局是否正确
- 迭代循环是否正常工作
- 错误处理是否生效

## 迭代验证

故意引入偏差测试验证循环：
1. 手动修改生成的代码（如改变颜色、间距）
2. 运行 `/d2c-verify`
3. 确认能检测到偏差
4. 确认偏差报告准确描述问题
5. 确认后续迭代能修正问题

## 错误处理验证

| 测试场景 | 操作 | 预期行为 |
|----------|------|----------|
| Figma MCP 不可用 | 断开 MCP 后运行 extract | 提示手动输入 |
| Chrome MCP 不可用 | 断开 MCP 后运行 verify | 跳过视觉验证并警告 |
| TypeScript 错误 | 引入类型错误 | 报告错误并尝试修复 |
| 超过迭代上限 | 设置低匹配阈值 | 展示状态请用户介入 |
