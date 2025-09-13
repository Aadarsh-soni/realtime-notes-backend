#!/bin/bash

# Vercel Deployment Script
echo "🚀 Deploying to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel:"
    vercel login
fi

# Deploy to Vercel
echo "📦 Deploying..."
vercel --prod

echo "✅ Deployment complete!"
echo "📋 Next steps:"
echo "1. Set up your PostgreSQL database (Neon or Supabase)"
echo "2. Add environment variables in Vercel dashboard:"
echo "   - DATABASE_URL (your PostgreSQL connection string)"
echo "   - JWT_SECRET (strong secret for JWT tokens)"
echo "   - NODE_ENV=production"
echo "3. Run database migration: npx prisma migrate deploy"
