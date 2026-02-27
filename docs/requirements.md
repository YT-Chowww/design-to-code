# 需求说明

## 功能需求

### FR-1: Figma 设计提取
- 通过 Figma MCP 获取设计稿的结构化数据
- 解析组件层级、布局结构、颜色/字体/间距、图片资源
- 交叉引用设计系统 token 和业务组件库
- 输出结构化设计规格文档

### FR-2: Vue 3 代码生成
- 生成符合规范的 Vue 3 SFC 文件（`<script setup lang="ts">`）
- TypeScript 接口定义 props/emits
- 支持 Scoped CSS / CSS Modules
- 支持 Composition API
- 迭代时根据偏差报告做针对性修改

### FR-3: 代码校验与运行
- TypeScript 类型检查（vue-tsc）
- ESLint 代码规范检查
- Vite 构建验证
- 启动 Vite 开发服务器预览

### FR-4: 视觉验证
- 通过 Chrome DevTools MCP 截取页面截图
- 多模态对比截图与设计稿
- 评估维度：布局准确性、字体排版、颜色一致性、组件渲染
- 评分 ≥90% 通过，否则输出偏差报告

### FR-5: 项目集成
- 读取目标项目结构，理解约定
- 按类型放置文件（components → `src/components/`，pages → `src/views/`）
- 适配目标项目（import 路径、设计 token、路由配置）
- 运行目标项目的 lint/format 工具

### FR-6: 迭代循环
- 最多 3 次迭代优化
- 每次迭代根据偏差报告做针对性修改
- 超过上限时展示当前状态，请用户介入

## 非功能需求

### NFR-1: 可配置性
- 上下文文件（设计系统、组件库、项目配置）用户可自定义
- 迭代上限可配置
- CSS 方案可选（Scoped CSS / CSS Modules）

### NFR-2: 容错性
- Figma MCP 不可用时支持手动输入
- Chrome DevTools MCP 不可用时跳过视觉验证
- TypeScript 错误多次修复失败时降级处理

### NFR-3: 模块化
- 每个子 skill 可独立调用
- 主编排器协调整体流程但不耦合子 skill 实现

### NFR-4: 代码质量
- 生成代码符合 Vue 3 + TypeScript 最佳实践
- 遵循用户项目的编码规范
- 无安全漏洞（XSS、注入等）
