#!/bin/bash
set -e

export NEXT_TELEMETRY_DISABLED=1

echo "Installing dependencies..."
npm ci

echo "Running: Prettier"
npx prettier --check .

echo "Running: ESLint"
npx eslint . --ext .ts,.tsx,.js,.jsx

echo "Building app"
npm run build

echo "Build and Lint completed successfully."
