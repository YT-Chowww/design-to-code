# 测试：d2c-validate 是否正确报告检查结果
run_eval \
  "validate-report" \
  "使用 /d2c-validate skill 对 .d2c/preview/ 项目进行校验。请按照 skill 定义的流程执行检查并输出结构化结果。" \
  "TypeScript|ESLint|Vite|check|build|通过|passed|失败|failed|install" \
  "输出包含 TypeScript/ESLint/Vite 检查结果"
