# 目标项目配置 (Project Config)

> `project-config.json` 是机器优先读取的权威来源；本文件是给人看的说明镜像。
> `/d2c-init` 会先自动检测，再由你按需修正。

## 检测到的技术栈

> 以下字段由 `/d2c-init` 自动填写。若未检测到项目（如在空目录运行），则使用最小默认值。

- **framework**: vue3
- **language**: typescript
- **buildTool**: vite
- **cssStrategy**: scoped
- **componentLibrary**: none
- **router**: none
- **stateManagement**: none

<!--
framework 取值: vue3 | react
language 取值: typescript | javascript
buildTool 取值: vite | umi | next | webpack | none
cssStrategy 取值: scoped | css-modules | tailwind | styled-components | sass | less
componentLibrary 取值: element-plus | ant-design-vue | vuetify | mui | antd | shadcn | none | <其他>
router 取值: vue-router | react-router-dom | umi-router | none
stateManagement 取值: pinia | vuex | dva | redux | zustand | jotai | none
-->

## 工具链检测

> 下列信息用于 `d2c-validate` 和 `d2c-merge` 判断是否运行 lint / format / stylelint。

- **Linter**: none
- **Formatter**: none
- **Style Linter**: none
- **Linter Command**: 留空表示跳过
- **Formatter Command**: 留空表示跳过
- **Config Sources**: 记录真实配置文件路径，支持向上查找 monorepo 根目录

## 路径与别名

```text
srcRoot: src
componentDirs:
  - src/components
pageDirs:
  - src/pages
  - src/views
styleDirs:
  - src/styles
  - src/assets/styles
assetDirs:
  - src/assets
```

```typescript
// aliasMap 示例
{
  "@": "src"
}
```

## 命名与合并约定

- 组件文件：优先 PascalCase；若项目已有命名体系，以项目现状为准
- 页面文件：页面级组件与通用组件分目录管理
- 样式文件：遵循 `cssStrategy` 对应的文件扩展名和组织方式
- D2C 预览工程聚焦“可运行 + 可校验”
- D2C 合并阶段优先遵循目标项目真实 lint / format 配置

## 备注

- 如果项目是 monorepo，请补充 repo root、子项目根目录和共享配置位置
- 如果存在特殊脚手架约定（如生成器、代码模板、特殊 alias），请同步写入 `project-config.json`
