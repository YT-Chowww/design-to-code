# SimpleCard 设计规格（测试固件）
# 用于 d2c-generate 测试，无需 Figma MCP

## Design Specification

### Overview
- Source: Test Fixture (no Figma URL)
- Frame: SimpleCard
- Dimensions: 320px x auto

### Component Tree
- SimpleCard

### Components

#### SimpleCard
- **Role**: 信息展示卡片
- **Layout**: flex-column
- **Size**: 320px x auto

##### Styles
- Background: var(--color-background) / #FFFFFF
- Border: none
- Border Radius: var(--radius-md) / 8px
- Shadow: var(--shadow-md) / 0 4px 6px rgba(0, 0, 0, 0.1)
- Padding: var(--spacing-6) / 24px

##### Children
1. **Title** (h3)
   - Font: var(--font-size-lg) / 18px, var(--font-weight-bold) / 700
   - Color: var(--color-text-primary) / #1F2937

2. **Description** (p)
   - Font: var(--font-size-sm) / 14px, var(--font-weight-normal) / 400
   - Color: var(--color-text-secondary) / #6B7280
   - Margin Top: var(--spacing-2) / 8px

3. **Action Button** (button)
   - Background: var(--color-primary) / #3B82F6
   - Color: #FFFFFF
   - Border Radius: 6px
   - Padding: 8px 16px
   - Margin Top: var(--spacing-4) / 16px
   - Font: var(--font-size-sm) / 14px, var(--font-weight-medium) / 500

### Assets
None

### Design Tokens Mapping
- #FFFFFF → var(--color-background)
- #1F2937 → var(--color-text-primary)
- #6B7280 → var(--color-text-secondary)
- #3B82F6 → var(--color-primary)
- 8px radius → var(--radius-md)
- 24px padding → var(--spacing-6)
