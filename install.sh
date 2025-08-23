#!/bin/bash

# CoinMarketCap MCP Server Installation Script
set -e

echo "🚀 Installing CoinMarketCap MCP Server..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -c 2-)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
if [ $MAJOR_VERSION -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 18+:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment template
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your CoinMarketCap API key:"
    echo "   CMC_API_KEY=your_api_key_here"
    echo
else
    echo "✅ Environment file already exists"
fi

# Build the project
echo "🔨 Building project..."
npm run build

echo
echo "✅ Installation complete!"
echo
echo "📋 Next steps:"
echo "1. Get a CoinMarketCap Pro API key: https://coinmarketcap.com/api/"
echo "2. Edit .env file and add your API key"
echo "3. Test the server: npm run dev"
echo "4. Add to Claude Desktop configuration:"
echo
cat <<EOF
{
  "mcpServers": {
    "coinmarketcap": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"],
      "env": {
        "CMC_API_KEY": "your_api_key_here"
      }
    }
  }
}
EOF
echo
echo "🎉 Happy analyzing!"