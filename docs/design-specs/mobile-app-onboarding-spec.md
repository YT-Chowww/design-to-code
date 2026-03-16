# Mobile App Onboarding 设计规格（真实 Figma 数据固件）
# 来源: Figma Mobile Apps – Prototyping Kit (Community)
# URL: https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-–-Prototyping-Kit--Community-?node-id=240-6278

## Design Specification

### Overview
- Source: Figma (Real Data)
- Frame: Onboarding Screen
- Dimensions: 375px x 812px (Mobile)
- Platform: iOS / Mobile

### Component Tree
- OnboardingScreen
  - StatusBar
  - IllustrationArea
  - PaginationDots
  - ContentArea
    - Title
    - Description
  - NextButton

### Components

#### OnboardingScreen
- **Role**: 移动端引导页
- **Layout**: flex-column, align-center
- **Size**: 375px x 812px
- **Styles**:
  - Background: #FFFFFF

#### StatusBar
- **Role**: iOS 状态栏
- **Layout**: flex-row, justify-between
- **Size**: 375px x 44px
- **Styles**:
  - Background: transparent
- **Children**:
  1. Time (left)
  2. Signal / WiFi / Battery icons (right)

#### IllustrationArea
- **Role**: 引导页插图区域
- **Layout**: flex-column, align-center, justify-center
- **Size**: 375px x ~400px
- **Styles**:
  - Background: #EAF2FF (浅蓝色)
  - Border Radius: 0 0 24px 24px (底部圆角)
- **Children**:
  1. Illustration graphic (中心图标/插画)

#### PaginationDots
- **Role**: 分页指示器
- **Layout**: flex-row, gap 8px, justify-center
- **Size**: auto x 8px
- **Styles**:
  - Margin Top: 24px
- **Children**:
  1. Dot 1 (Active): 24px x 8px, background #006FFD, border-radius 4px
  2. Dot 2 (Inactive): 8px x 8px, background #D4D6DD, border-radius 4px
  3. Dot 3 (Inactive): 8px x 8px, background #D4D6DD, border-radius 4px

#### ContentArea
- **Role**: 文字内容区域
- **Layout**: flex-column, align-center, text-center
- **Size**: 100% x auto
- **Styles**:
  - Padding: 24px 32px

#### Title
- **Role**: 主标题
- **Element**: h1
- **Text**: "Create a prototype in just a few minutes"
- **Styles**:
  - Font Family: Inter
  - Font Size: 24px
  - Font Weight: 800 (ExtraBold)
  - Color: #1A1C1E
  - Line Height: 32px
  - Text Align: center

#### Description
- **Role**: 描述文字
- **Element**: p
- **Text**: "Quickly create interactive prototypes with pre-built components and templates."
- **Styles**:
  - Font Family: Inter
  - Font Size: 12px
  - Font Weight: 400 (Regular)
  - Color: #71727A
  - Line Height: 18px
  - Text Align: center
  - Margin Top: 12px

#### NextButton
- **Role**: 下一步按钮
- **Element**: button
- **Text**: "Next"
- **Styles**:
  - Background: #006FFD
  - Color: #FFFFFF
  - Font Family: Inter
  - Font Size: 14px
  - Font Weight: 600 (SemiBold)
  - Border Radius: 12px
  - Padding: 16px 0
  - Width: calc(100% - 48px) (左右各 24px margin)
  - Margin: 24px 24px 48px 24px
  - Text Align: center
  - Border: none
  - Cursor: pointer

### Assets
1. **Illustration** — IllustrationArea 中的图标/插画
   - Type: SVG / PNG
   - Location: `.d2c/assets/onboarding-illustration.svg`

### Design Tokens Mapping
- #FFFFFF → var(--color-background)
- #EAF2FF → var(--color-surface-light)
- #1A1C1E → var(--color-text-primary)
- #71727A → var(--color-text-secondary)
- #006FFD → var(--color-primary)
- #D4D6DD → var(--color-border)
- 12px border-radius → var(--radius-lg)
- 24px padding → var(--spacing-6)
- 32px padding → var(--spacing-8)
- Inter → var(--font-family-base)

### Interaction Notes
- 点击 "Next" 按钮跳转到下一个引导页
- 分页圆点反映当前页码
- 支持左右滑动切换页面（可选）
