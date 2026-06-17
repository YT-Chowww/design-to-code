# 设计规格文档（Design Specs）

这个目录用于保存仓库内的示例设计规格文档，帮助说明 normalized design 如何转成人工可读的设计说明。

注意边界：

- 真实 D2C 运行产生的设计规格应写入目标项目的 `.d2c/docs/design-specs/<designId>/`。
- 本目录里的文件主要用于文档示例、协议说明和长期参考。
- 如果某个设计规格要作为自动验证输入，应放入 `docs/validation-fixtures/`，并由对应 `scripts/check-*.mjs` 校验。

## 当前文件

| 文件 | 用途 |
| --- | --- |
| `mobile-app-onboarding-spec.md` | 示例设计规格文档 |
