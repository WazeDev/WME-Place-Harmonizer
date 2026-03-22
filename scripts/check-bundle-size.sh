#!/bin/bash

# Check final bundle size
BUNDLE_FILE="releases/release-$(node -p "require('./package.json').version").user.js"

if [ -f "$BUNDLE_FILE" ]; then
  SIZE=$(wc -c < "$BUNDLE_FILE")
  SIZE_KB=$((SIZE / 1024))
  
  echo "Bundle size: ${SIZE_KB} KB"
  
  if [ $SIZE_KB -gt 500 ]; then
    echo "⚠️  Warning: Bundle is larger than 500 KB"
  else
    echo "✅ Bundle size is acceptable"
  fi
else
  echo "❌ Bundle file not found: $BUNDLE_FILE"
  exit 1
fi
