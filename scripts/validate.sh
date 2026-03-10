#!/bin/bash
# validate.sh - Run ESLint + TypeScript checks on the preview project
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

echo "=== TypeScript Check ==="
npx vue-tsc --noEmit 2>&1 || {
  echo "TypeScript check failed"
  exit 1
}
echo "TypeScript check passed"

echo ""
echo "=== ESLint Check ==="
npx eslint . --ext .vue,.js,.jsx,.ts,.tsx 2>&1 || {
  echo "ESLint check failed"
  exit 1
}
echo "ESLint check passed"

echo ""
echo "=== Vite Build ==="
npx vite build 2>&1 || {
  echo "Vite build failed"
  exit 1
}
echo "Vite build passed"

echo ""
echo "All checks passed!"
