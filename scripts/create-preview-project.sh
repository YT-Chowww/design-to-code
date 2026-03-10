#!/bin/bash
# create-preview-project.sh - Create a preview project for D2C
set -e

TARGET_DIR="${1:-.d2c/preview}"

if [ -d "$TARGET_DIR" ] && [ -f "$TARGET_DIR/package.json" ]; then
  echo "Preview project already exists at: $TARGET_DIR"
  echo "Updating source files only..."
  # Only copy src/ to preserve node_modules
  if [ -d "$TARGET_DIR/src" ]; then
    echo "Source directory exists, skipping (use d2c-generate to update)"
  fi
else
  echo "Creating preview project at: $TARGET_DIR"
  mkdir -p "$TARGET_DIR/src/components"
  mkdir -p "$TARGET_DIR/src/assets"

  # Note: Template files are created by /d2c-init or /d2c-validate Step 0
  echo "Run /d2c-init to create the full preview project structure"
fi

cd "$TARGET_DIR"

# Install dependencies if needed
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Preview project ready at: $TARGET_DIR"
echo "Run 'cd $TARGET_DIR && npm run dev' to start the dev server"
