# 架构设计

## 整体架构

D2C 采用 **主编排 + 子 Skill** 的架构，通过 Claude Code Skill 系统实现模块化工作流。

```
┌─────────────────────────────────────────────┐
│              /d2c (主编排器)                  │
│  加载上下文 → 协调子 skill → 管理迭代循环      │
└────────┬────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┬─────────┐
    ▼         ▼          ▼          ▼         ▼
┌────────┐┌────────┐┌─────────┐┌────────┐┌────────┐
│extract ││generate││validate ││verify  ││merge   │
│Figma   ││Vue 3   ││TS+Lint  ││截图对比 ││项目集成 │
│MCP     ││SFC     ││+Build   ││MCP     ││        │
└────────┘└────────┘└─────────┘└────────┘└────────┘
    │         │          │          │
    ▼         ▼          ▼          ▼
┌────────┐┌────────┐┌─────────┐┌────────┐
│Figma   ││context/││Vite     ││Chrome  │
│MCP     ││规范文件 ││Preview  ││DevTools│
│Server  ││        ││Project  ││MCP     │
└────────┘└────────┘└─────────┘└────────┘
```

## MCP 集成

### Figma MCP (Framelink)
- **工具**: `npx -y figma-developer-mcp`
- **能力**: `get_figma_data`, `download_figma_images`
- **作用**: 获取 Figma 设计稿的结构化数据，压缩约 90% 更适合 LLM 消费

### Chrome DevTools MCP
- **工具**: `npx -y chrome-devtools-mcp@latest`
- **能力**: `navigate_page`, `take_screenshot`, `resize_page`
- **作用**: 控制 Chrome 浏览器进行页面截图和视觉验证

## 上下文系统

```
context/
├── design-system.md        # 设计 token（颜色、字体、间距、断点）
├── component-library.md    # 业务组件库（import 路径、props、用法）
└── project-config.md       # 目标项目配置（技术栈、目录结构、命名约定）
```

CLAUDE.md 通过 `@context/` 引用自动加载这些文件，为所有 skill 提供统一上下文。

## 验证循环

```
迭代 0:
  extract → generate → validate → verify
                                    │
                            Pass(≥90%) → merge → 完成
                            Fail → 偏差报告
                                    │
迭代 1~3:
  generate(偏差报告) → validate → verify
                                    │
                            Pass → merge
                            Fail(迭代≥3) → 用户介入
```

### 偏差报告格式
每次验证失败时生成结构化偏差报告，包含：
- 布局偏差（元素位置、间距、对齐）
- 样式偏差（颜色、字体、圆角、阴影）
- 内容偏差（文字、图片、图标）
- 具体修改建议

## 预览项目

使用最小化 Vite + Vue 3 项目模板进行代码预览和验证：

```
templates/vite-preview/
├── package.json          # 依赖声明
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── index.html            # 入口 HTML
└── src/
    ├── main.ts           # 应用入口
    └── App.vue           # 根组件
```

生成的代码写入 `src/` 目录，通过 Vite 开发服务器实时预览。

## 错误处理策略

| 场景 | 策略 |
|------|------|
| Figma MCP 不可用 | 提示用户手动粘贴设计详情 |
| Chrome DevTools MCP 不可用 | 跳过视觉验证，仅依赖静态校验 |
| TypeScript 错误修复 2 次仍失败 | 添加 `// @ts-ignore` + TODO 注释 |
| 设计过于复杂（>5 个独立区域） | 分解为子组件，逐个生成后组合 |
| 迭代 3 次仍未通过验证 | 展示当前状态和偏差报告，请用户介入 |
