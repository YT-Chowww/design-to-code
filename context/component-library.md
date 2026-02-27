# 业务组件库 (Component Library)

> 请根据你的项目填写以下内容。列出可复用的业务组件，D2C 在生成代码时会优先使用这些组件。

## 组件列表

### Button
```vue
<script setup lang="ts">
import Button from '@/components/Button.vue'
</script>

<template>
  <Button type="primary" size="medium" @click="handleClick">
    点击按钮
  </Button>
</template>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | `'primary' \| 'secondary' \| 'text'` | `'primary'` | 按钮类型 |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮尺寸 |
| disabled | `boolean` | `false` | 是否禁用 |
| loading | `boolean` | `false` | 是否加载中 |

---

### Input
```vue
<script setup lang="ts">
import Input from '@/components/Input.vue'
</script>

<template>
  <Input v-model="value" placeholder="请输入" />
</template>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| modelValue | `string` | `''` | 输入值（v-model） |
| placeholder | `string` | `''` | 占位文本 |
| disabled | `boolean` | `false` | 是否禁用 |
| type | `'text' \| 'password' \| 'number'` | `'text'` | 输入类型 |

---

> 添加更多组件时，请按以上格式填写：
> 1. 组件名（PascalCase）
> 2. 导入和使用示例
> 3. Props 表格
