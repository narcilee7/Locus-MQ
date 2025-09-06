#!/bin/bash

# Development setup script for LocusMQ

set -e

echo "🚀 Setting up LocusMQ development environment..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create development database
echo "🗄️ Creating development database..."
if [ ! -f "locusmq-dev.sqlite" ]; then
    sqlite3 locusmq-dev.sqlite < migrations/init.sql
    echo "✅ Development database created"
else
    echo "✅ Development database already exists"
fi

# Run initial tests
echo "🧪 Running initial tests..."
npm test

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build project
echo "🏗️ Building project..."
npm run build

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Copy .env.example to .env and modify as needed"
echo "2. Run 'npm run dev' to start development mode"
echo "3. Run 'npm test -- --watch' to run tests in watch mode"
echo "4. Run 'npm run test:ui' to open Vitest UI"