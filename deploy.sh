#!/bin/bash
# ══════════════════════════════════════════════════════════════
# EngrHenryTech BusinessAI — VPS Deployment Script
# Run on Ubuntu 22.04 VPS
# Usage: chmod +x deploy.sh && ./deploy.sh
# ══════════════════════════════════════════════════════════════

set -e
echo "🚀 Starting EngrHenryTech BusinessAI deployment..."

# ── 1. Install Docker if not installed ───────────────────────
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
  echo "✅ Docker installed"
fi

# ── 2. Install Docker Compose if not installed ───────────────
if ! command -v docker compose &> /dev/null; then
  echo "📦 Installing Docker Compose..."
  sudo apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
fi

# ── 3. Check .env exists ─────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo "   Copy .env.production to .env and fill in all values"
  exit 1
fi

echo "✅ .env file found"

# ── 4. Build and start services ──────────────────────────────
echo "🔨 Building Docker images (this takes 3-5 minutes first time)..."
docker compose build --no-cache

echo "▶️  Starting services..."
docker compose up -d

# ── 5. Wait for services to be healthy ───────────────────────
echo "⏳ Waiting for services to start..."
sleep 15

# Check backend health
for i in {1..12}; do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
    break
  fi
  echo "   Waiting for backend... ($i/12)"
  sleep 5
done

# ── 6. Show status ───────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "✅ EngrHenryTech BusinessAI is running!"
echo "════════════════════════════════════════"
docker compose ps
echo ""
echo "🔗 Backend:   http://localhost:5000"
echo "🔗 Frontend:  http://localhost:80"
echo "🔗 Embedding: http://localhost:8000"
echo ""
echo "📋 Useful commands:"
echo "   docker compose logs -f          # View all logs"
echo "   docker compose logs -f backend  # View backend logs"
echo "   docker compose restart backend  # Restart backend"
echo "   docker compose down             # Stop everything"
