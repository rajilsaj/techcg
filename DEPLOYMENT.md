# Tech.CG Deployment Guide

## Prerequisites

Before deploying, you'll need:
1. **Vercel Account** - https://vercel.com
2. **GitHub Repository** - https://github.com/rajilsaj/techcg
3. **Supabase Project** - https://supabase.com
4. **Vercel CLI** - `npm install -g vercel`

---

## Step 1: Vercel Setup

### 1.1 Create/Link Project

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Link project to Vercel
vercel link

# Follow prompts:
# - Link to existing project or create new
# - Select team/scope
# - Project name: techcg
```

### 1.2 Get Vercel Credentials

After linking, get these from Vercel Dashboard:

1. **VERCEL_TOKEN**:
   - Go to https://vercel.com/account/tokens
   - Create new token (name: `github-ci`)
   - Copy the token

2. **VERCEL_ORG_ID**:
   - Go to https://vercel.com/account/billing (or your team settings)
   - Look for "Team ID" or "Org ID"

3. **VERCEL_PROJECT_ID**:
   - Go to https://vercel.com/projects
   - Click `techcg` project
   - Copy project ID from settings/URL

---

## Step 2: GitHub Secrets

### Add Secrets to Repository

1. **Go to GitHub Repository**:
   - https://github.com/rajilsaj/techcg
   - Settings → Secrets and variables → Actions

2. **Add Repository Secrets**:

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `VERCEL_TOKEN` | `xxx_xxxxxxx...` | Vercel Account Settings → Tokens |
| `VERCEL_ORG_ID` | `Team1234567...` | Vercel Dashboard → Team Settings |
| `VERCEL_PROJECT_ID` | `prj_xxxxxxx...` | Vercel Dashboard → Project Settings |
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres` | Supabase Project Settings → Connection String |

**Steps to add each secret**:
1. Click "New repository secret"
2. Name: `VERCEL_TOKEN`
3. Value: Paste token
4. Click "Add secret"
5. Repeat for each secret

---

## Step 3: Vercel Environment Variables

### Add Environment Variables to Vercel

1. **Go to Vercel Project Settings**:
   - https://vercel.com/projects/techcg
   - Settings → Environment Variables

2. **Add Production Variables**:

| Name | Value | Production | Preview | Development |
|------|-------|-----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | ✅ | ❌ |
| `CRON_SECRET` | Random secure string | ✅ | ❌ | ❌ |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://PROJECT.supabase.co` | ✅ | ✅ | ❌ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ | ✅ | ❌ |

**Steps for each variable**:
1. Click "Add New"
2. Name: `DATABASE_URL`
3. Value: Paste Supabase connection string
4. Select "Production" checkbox
5. Click "Save"
6. Repeat for other variables

### Get Supabase Credentials

From Supabase Dashboard (https://app.supabase.com):

1. **DATABASE_URL**:
   - Project Settings → Database → Connection String
   - Format: `postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres`

2. **NEXT_PUBLIC_SUPABASE_URL**:
   - Project Settings → General → Project URL
   - Format: `https://PROJECT.supabase.co`

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - Project Settings → API → Project API keys
   - Copy "anon" public key

4. **CRON_SECRET**:
   - Generate a secure random string:
   ```bash
   openssl rand -base64 32
   ```

---

## Step 4: Deploy

### Option 1: Auto-Deploy (Recommended)

Just push to main branch:
```bash
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build verification
3. Deploy to Vercel (if tests pass)
4. Run database migrations (if schema changed)

### Option 2: Manual Deploy

```bash
# Set environment variables from .env.local
export $(cat .env.local | grep -v '#' | xargs)

# Deploy to production
vercel deploy --prod
```

---

## Step 5: Configure Cron Job

### Set Up Ranking Sweep

In Vercel Dashboard → Crons:

1. Click "Create Cron"
2. **Endpoint**: `POST /api/cron/rank`
3. **Schedule**: `0 */2 * * * *` (every 2 minutes)
4. **Headers**: 
   - Name: `x-cron-secret`
   - Value: `[your-CRON_SECRET]`
5. Click "Create"

---

## Step 6: Verify Deployment

### Check Build Status
- GitHub Actions: https://github.com/rajilsaj/techcg/actions
- Vercel Deployments: https://vercel.com/projects/techcg/deployments

### Test the App
- Visit deployment URL from Vercel dashboard
- Create account
- Submit a story
- Test voting and comments

### Monitor Cron Jobs
- Vercel Dashboard → Crons
- Check recent executions and logs

---

## Troubleshooting

### Build Fails: "DATABASE_URL not found"
**Solution**: Add `DATABASE_URL` to Vercel Environment Variables (see Step 3)

### Tests Fail: Secrets not available
**Solution**: Add secrets to GitHub repository (see Step 2)

### Cron not running
**Solution**: Verify endpoint is `POST /api/cron/rank` and header is set

### Migrations not running
**Solution**: Ensure `DATABASE_URL` is set and schema changed in `prisma/schema.prisma`

---

## Useful Commands

```bash
# View current deployment
vercel env pull

# Check deployed environment
vercel env list

# View Vercel logs
vercel logs

# Manually run migrations
npx prisma migrate deploy

# Test cron endpoint locally
curl -X POST http://localhost:3000/api/cron/rank \
  -H "x-cron-secret: your-secret"
```

---

## Security Checklist

- ✅ Never commit `.env.local` to repository
- ✅ Use strong `CRON_SECRET` (32+ random characters)
- ✅ Rotate `VERCEL_TOKEN` periodically
- ✅ Restrict repository secret access to necessary workflows
- ✅ Enable branch protection on `main`
- ✅ Review GitHub Actions logs for sensitive data leaks

---

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- GitHub Actions: https://docs.github.com/en/actions
- Prisma Migrate: https://www.prisma.io/docs/orm/prisma-migrate
