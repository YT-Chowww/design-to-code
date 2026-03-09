# 测试：d2c-merge 在目标目录无效时是否正确报错
run_eval \
  "merge-invalid-dir" \
  "使用 /d2c-merge skill 将代码合入 /tmp/nonexistent-project-dir-12345 目录。" \
  "不存在|not found|not exist|无效|invalid|检查|check|错误|error" \
  "目标目录无效时给出错误提示"
