# 落地页设计规格（测试固件）
# 用于测试组件拆分和复杂页面生成

## Design Specification

### Overview
- Source: Test Fixture (no Figma URL)
- Frame: LandingPage
- Dimensions: 1440px x auto

### Component Tree
- LandingPage
  - NavHeader
  - HeroBanner
  - FeatureSection
    - FeatureCard (x3)
  - PricingSection
    - PricingCard (x3)
  - TestimonialSection
  - Footer

### Components

#### NavHeader
- **Role**: 顶部导航栏
- **Layout**: flex-row, justify-between, align-center
- **Size**: 100% x 64px
- **Styles**:
  - Background: #FFFFFF
  - Border Bottom: 1px solid var(--color-border)
  - Padding: 0 var(--spacing-16)
- **Children**:
  1. Logo (文字 "Brand", 20px bold)
  2. NavLinks (flex-row, gap 32px, 14px medium)
  3. CTA Button (primary, "Get Started")

#### HeroBanner
- **Role**: 首屏大图区域
- **Layout**: flex-column, align-center, text-center
- **Size**: 100% x 600px
- **Styles**:
  - Background: linear-gradient(135deg, #667eea, #764ba2)
  - Padding: var(--spacing-16) var(--spacing-12)
- **Children**:
  1. Heading (48px bold, white)
  2. Subheading (18px normal, white/80%)
  3. CTA Button (white bg, primary text, large)

#### FeatureSection
- **Role**: 特性展示区
- **Layout**: CSS Grid, 3 columns, gap 32px
- **Size**: 100% x auto
- **Styles**:
  - Padding: var(--spacing-16) var(--spacing-12)
  - Background: var(--color-surface)
- **Children**: 3x FeatureCard

#### FeatureCard
- **Role**: 单个特性卡片
- **Layout**: flex-column, align-center, text-center
- **Styles**:
  - Background: white
  - Border Radius: var(--radius-lg)
  - Padding: var(--spacing-8)
  - Shadow: var(--shadow-sm)
- **Children**:
  1. Icon (48px, primary color)
  2. Title (18px semibold)
  3. Description (14px, secondary color)

#### PricingSection
- **Role**: 价格方案展示
- **Layout**: flex-row, justify-center, gap 24px
- **Size**: 100% x auto
- **Styles**:
  - Padding: var(--spacing-16) var(--spacing-12)
- **Children**: 3x PricingCard

#### PricingCard
- **Role**: 单个价格卡片
- **Layout**: flex-column
- **Styles**:
  - Border: 1px solid var(--color-border)
  - Border Radius: var(--radius-lg)
  - Padding: var(--spacing-8)
  - Width: 320px
- **Children**:
  1. Plan name (16px semibold)
  2. Price (36px bold)
  3. Feature list (14px, bullet points)
  4. CTA Button

#### TestimonialSection
- **Role**: 用户评价区域
- **Layout**: flex-column, align-center
- **Size**: 100% x auto
- **Styles**:
  - Background: var(--color-surface)
  - Padding: var(--spacing-16) var(--spacing-12)
- **Children**:
  1. Quote text (18px italic)
  2. Author name (14px semibold)
  3. Author title (12px, secondary color)

#### Footer
- **Role**: 底部信息
- **Layout**: flex-row, justify-between
- **Size**: 100% x auto
- **Styles**:
  - Background: #1F2937
  - Color: #9CA3AF
  - Padding: var(--spacing-12) var(--spacing-16)
- **Children**:
  1. Brand + description
  2. Link columns (Product, Company, Support)
  3. Copyright text
