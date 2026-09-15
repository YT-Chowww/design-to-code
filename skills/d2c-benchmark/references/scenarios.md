# Fixed Benchmark scenarios

Use this table exactly. Do not substitute a parent, sibling, or visually similar node.

| Key | Figma URL | Frame | Route | Target |
|---|---|---|---|---|
| `pc-data` | `https://www.figma.com/design/h6yGJDAcQ4vX3fO93nYCLh/%E3%80%90PRD%E3%80%91%E4%BC%81%E5%BE%AE%E5%AE%A2%E6%88%B7%E5%88%97%E8%A1%A8?node-id=320-13867` | width 1400, content height | `/data-management` | React + Ant Design |
| `pc-chart` | `https://www.figma.com/design/Ln2fBahqlpYrUZmwQG4vNy/?node-id=212-8232` | 500 × 320 | `/chart-analytics` | React + Ant Design + ECharts |
| `mobile-content` | `https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-%E2%80%93-Prototyping-Kit--Community-?node-id=240-6278` | 375 × 812 | `/content-display` | Vue 3 + Vant |
| `mobile-form` | `https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-%E2%80%93-Prototyping-Kit--Community-?node-id=267-5066` | 375 × 812 | `/form-interaction` | Vue 3 + Vant |

## Visible interactions

These are local display interactions only. Use page-local mock data; do not create business APIs, authentication, permissions, stores, routes, or tracking.

| Key | Required visible behavior |
|---|---|
| `pc-data` | Tabs can switch visible content; table controls visibly respond while preserving the designed state. |
| `pc-chart` | ECharts provides a tooltip or legend response represented by the design; no other chart package is allowed. |
| `mobile-content` | The onboarding next-button changes the visible current item/state locally. |
| `mobile-form` | The login field accepts input and the login button exposes its visible enabled, disabled, or feedback behavior locally. |

## Node scope

`pc-chart` node `212:8232` is the fixed 500 × 320 chart component, not a complete analytics page. Render that component in a minimal 真实 React 路由 host at `/chart-analytics`; do not invent filters, navigation, cards, metrics, or other surrounding analytics UI that is absent from the node.

PC scenarios use only React, Ant Design, and the scaffold's fixed ECharts dependency. Mobile scenarios use only Vue 3 and Vant. All four scenes remain independent inside the matching scaffold and write only under `.d2c-benchmark/latest/`.
