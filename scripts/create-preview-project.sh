#!/bin/bash
# create-preview-project.sh - Create a preview project from the template
set -e

TEMPLATE_DIR="templates/vite-preview"
TARGET_DIR="${1:-.d2c-preview}"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: Template directory not found: $TEMPLATE_DIR"
  exit 1
fi

if [ -d "$TARGET_DIR" ]; then
  echo "Preview project already exists at: $TARGET_DIR"
  echo "Updating source files only..."
  # Only copy src/ to preserve node_modules
  cp -r "$TEMPLATE_DIR/src/"* "$TARGET_DIR/src/"
else
  echo "Creating preview project at: $TARGET_DIR"
  cp -r "$TEMPLATE_DIR" "$TARGET_DIR"
fi

cd "$TARGET_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Preview project ready at: $TARGET_DIR"
echo "Run 'cd $TARGET_DIR && npm run dev' to start the dev server"
