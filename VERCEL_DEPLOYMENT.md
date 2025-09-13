# 🚀 Vercel Deployment Guide

## Prerequisites
1. Vercel account (sign up at [vercel.com](https://vercel.com))
2. GitHub repository with your code
3. PostgreSQL database (recommended: [Neon](https://neon.tech) or [Supabase](https://supabase.com))

## Step 1: Prepare Database

### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (starts with `postgresql://`)

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string

## Step 2: Deploy to Vercel

### Method 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name: realtime-notes-backend
# - Directory: ./
# - Override settings? No
```

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure settings (see below)

## Step 3: Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Your PostgreSQL connection string |
| `JWT_SECRET` | `your-super-secret-jwt-key` | Strong secret for JWT tokens |
| `NODE_ENV` | `production` | Environment setting |

## Step 4: Database Migration

After deployment, run the database migration:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Run migration
vercel env pull .env.local
npx prisma migrate deploy
```

## Step 5: Test Deployment

Your API will be available at:
- `https://your-project-name.vercel.app/health`
- `https://your-project-name.vercel.app/auth/register`
- `https://your-project-name.vercel.app/notes`
- etc.

## 🔧 Configuration Files

### vercel.json
- Routes all requests to `src/index.ts`
- Sets up Node.js runtime
- Configures 30-second timeout

### package.json
- Added `vercel-build` script
- Generates Prisma client during build

### prisma/schema.prisma
- Updated to use PostgreSQL
- Compatible with Vercel's serverless environment

## 🚨 Important Notes

1. **WebSocket Limitation**: Vercel doesn't support persistent WebSocket connections in serverless functions. The collaboration features may not work in production.

2. **Database**: Use PostgreSQL (not SQLite) for production. SQLite files don't persist in serverless environments.

3. **Environment Variables**: Never commit `.env` files. Use Vercel's environment variable settings.

4. **Cold Starts**: First request may be slower due to serverless cold starts.

## 🔄 Updating Deployment

```bash
# Make changes to your code
git add .
git commit -m "Update API"
git push

# Vercel will automatically redeploy
```

## 📊 Monitoring

- Check Vercel dashboard for deployment logs
- Monitor function execution times
- Set up alerts for errors

## 🆘 Troubleshooting

### Build Errors
- Check Vercel build logs
- Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Verify TypeScript compilation

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if database allows connections from Vercel IPs
- Run `npx prisma migrate deploy` after deployment

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify environment variables are set
- Test locally with production environment variables
