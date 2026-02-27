# 目标项目配置 (Project Config)

> 请根据你的目标项目填写以下内容。D2C 在合并代码时会参考这些配置。

## 技术栈
- **框架**: Vue 3
- **语言**: TypeScript
- **构建工具**: Vite
- **CSS 方案**: Scoped CSS（可选：CSS Modules, Tailwind CSS）
- **状态管理**: Pinia（如使用）
- **路由**: Vue Router（如使用）

## 目录结构
```
src/
├── components/        # 通用组件
│   ├── common/        # 基础组件
│   └── business/      # 业务组件
├── views/             # 页面组件
├── composables/       # 组合式函数
├── stores/            # Pinia store
├── router/            # 路由配置
├── assets/            # 静态资源
│   ├── images/
│   └── styles/
├── types/             # 全局类型定义
└── utils/             # 工具函数
```

## 命名约定
- 组件文件：PascalCase（`UserProfile.vue`）
- 页面文件：PascalCase（`HomePage.vue`）
- 组合式函数：camelCase 以 `use` 开头（`useAuth.ts`）
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
