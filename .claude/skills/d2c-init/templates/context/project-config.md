# 目标项目配置 (Project Config)

> D2C 在初始化时会自动检测目标项目的技术栈并填写下方「检测到的技术栈」章节。
> 你也可以手动修改这些值来覆盖自动检测结果。

## 检测到的技术栈

> 以下字段由 `/d2c-init` 自动填写。若未检测到项目（如在空目录运行），则使用默认值。

- **framework**: vue3
- **language**: typescript
- **buildTool**: vite
- **cssStrategy**: scoped
- **componentLibrary**: none
- **router**: none
- **stateManagement**: none

<!--
framework 取值: vue3 | react | svelte | angular | vanilla
language 取值: typescript | javascript
buildTool 取值: vite | next | webpack | angular-cli | none
cssStrategy 取值: scoped | css-modules | tailwind | styled-components | sass | less | vanilla
componentLibrary 取值: element-plus | ant-design-vue | vuetify | mui | antd | shadcn | none | <其他>
router 取值: vue-router | react-router-dom | svelte-routing | angular-router | none
stateManagement 取值: pinia | vuex | redux | zustand | jotai | svelte-stores | ngrx | none
-->

## 目录结构
```
src/
├── components/        # 通用组件
│   ├── common/        # 基础组件
│   └── business/      # 业务组件
├── views/             # 页面组件（Vue）/ pages/（Next.js）
├── composables/       # 组合式函数（Vue）/ hooks/（React）
├── stores/            # 状态管理
├── router/            # 路由配置
├── assets/            # 静态资源
│   ├── images/
│   └── styles/
├── types/             # 全局类型定义
└── utils/             # 工具函数
```

## 命名约定
- 组件文件：PascalCase（`UserProfile.vue` / `UserProfile.tsx`）
- 页面文件：PascalCase（`HomePage.vue` / `HomePage.tsx`）
- 组合式函数 / Hooks：camelCase 以 `use` 开头（`useAuth.ts`）
- Store 文件：camelCase（`userStore.ts`）
- 工具函数：camelCase（`formatDate.ts`）

## 导入路径别名
```typescript
// tsconfig.json paths
{
  "@/*": ["./src/*"],
  "@components/*": ["./src/components/*"],
  "@views/*": ["./src/views/*"]
}
```

## 格式化工具
- **Linter**: ESLint
- **Formatter**: Prettier
- **命令**: `npm run lint`, `npm run format`
