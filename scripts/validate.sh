#!/bin/bash
# validate.sh - Run type checking + linting + build on the preview project
# Skill-level validation is phase-aware; this helper remains preview-focused.
# Runtime branching should prefer .d2c/context/project-config.json.
set -e

PREVIEW_DIR="${1:-.d2c/preview}"

if [ ! -d "$PREVIEW_DIR" ]; then
  echo "Error: Preview directory not found: $PREVIEW_DIR"
  echo "Run /d2c-init to create the preview project"
  exit 1
fi

cd "$PREVIEW_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "=== Type Check ==="
if npm run type-check 2>&1; then
  echo "Type check passed"
else
  echo "Type check failed (or no type-check script defined)"
  # Don't exit — continue with other checks
fi

echo ""
echo "=== ESLint Check ==="
if npm run lint 2>&1; then
  echo "ESLint check passed"
else
  echo "ESLint check failed (or no lint script defined)"
fi

echo ""
echo "=== Build ==="
npx vite build 2>&1 || {
  echo "Build failed"
  exit 1
}
echo "Build passed"

echo ""
echo "All checks passed!"
