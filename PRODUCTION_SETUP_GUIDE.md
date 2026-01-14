# Production Setup Guide

Complete step-by-step guide to deploy your backend and publish your mobile app.

---

## Part 1: Deploy Backend to Render

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (recommended) or email
3. Verify your email if needed

### Step 2: Create New Web Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect account"** if not connected
   - Select your repository: `TasksManagement`
   - Click **"Connect"**

### Step 3: Configure Service

Fill in the form:

- **Name**: `tasks-api` (or your preferred name)
- **Region**: Choose closest to you (e.g., `Oregon`)
- **Branch**: `main` or `master` (your production branch)
- **Root Directory**: `todo-backend`
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm ci && npx prisma generate && npm run build
  ```
- **Start Command**: 
  ```bash
  npm run start:prod
  ```

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

```
NODE_ENV=production
DATABASE_URL=your_supabase_connection_string_here
DIRECT_URL=your_supabase_direct_connection_string_here
PORT=3000
JWT_SECRET=generate_a_secure_random_string_here
```

**Important:**
- Use your Supabase connection strings (same as in your local `.env`)
- Generate a secure `JWT_SECRET` (you can use: `openssl rand -base64 32`)
- Make sure `DATABASE_URL` has password URL-encoded (`%40` for `@`)

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait 5-10 minutes for first deployment
4. Once deployed, you'll get a URL like: `https://tasks-api.onrender.com`

**Save this URL!** You'll need it for the mobile app.

### Step 6: Get Deploy Hook URL (for GitHub Actions)

1. Go to your service in Render Dashboard
2. Click **"Settings"** tab
3. Scroll to **"Deploy Hook"** section
4. Click **"Create Deploy Hook"**
5. Copy the URL (looks like: `https://api.render.com/deploy/srv-xxxxx?key=xxxxx`)

### Step 7: Add Deploy Hook to GitHub Secrets

1. Go to your GitHub repository
2. Click **"Settings"** → **"Secrets and variables"** → **"Actions"**
3. Click **"New repository secret"**
4. Name: `RENDER_DEPLOY_HOOK_URL`
5. Value: Paste the deploy hook URL from Step 6
6. Click **"Add secret"**

### Step 8: Test Deployment

1. Check Render dashboard - service should be "Live"
2. Visit your service URL: `https://your-service.onrender.com/api`
3. You should see Swagger documentation
4. Test an endpoint to verify it works

---

## Part 2: Update Mobile App for Production

### Step 1: Update API Configuration

You have two options:

#### Option A: Environment Variable (Recommended)

Create/update `mobile-app/.env`:
```env
EXPO_PUBLIC_API_URL=https://your-render-url.onrender.com
```

#### Option B: Update Code Directly

Edit `mobile-app/src/config/api.ts`:
```typescript
baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://your-render-url.onrender.com',
```

### Step 2: Rebuild App with Production URL

```bash
cd mobile-app
eas build --platform android --profile production
```

This will create a new AAB file with the production API URL.

---

## Part 3: Submit to Google Play Store

### Step 1: Create Google Play Developer Account

1. Go to https://play.google.com/console
2. Sign in with Google account
3. Pay **$25 one-time registration fee**
4. Complete registration form
5. **Wait for approval** (1-2 days)

### Step 2: Create App in Play Console

1. Once approved, click **"Create app"**
2. Fill in:
   - **App name**: "Tasks Management"
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
   - Check required declarations
3. Click **"Create app"**

### Step 3: Complete Store Listing

**Required items:**

1. **App icon** (512x512px)
   - Upload: `mobile-app/assets/icon.png`

2. **Feature graphic** (1024x500px)
   - Create a banner with app name
   - Upload in "Store listing" section

3. **Screenshots** (at least 2 required)
   - Take screenshots of your app
   - Minimum 2 phone screenshots

4. **Short description** (80 chars max)
   - Example: "Manage your daily, weekly, monthly, and yearly tasks with reminders"

5. **Full description** (up to 4000 chars)
   - Write detailed description of features

6. **Privacy Policy URL** (REQUIRED)
   - Create a privacy policy
   - Host it (GitHub Pages, your website, etc.)
   - Add URL in Play Console

### Step 4: Upload AAB File

1. Go to **"Production"** → **"Create new release"**
2. Click **"Upload"**
3. Select your `.aab` file (from EAS build)
4. Add **Release notes** (e.g., "Initial release")
5. Click **"Review release"**
6. Click **"Start rollout to Production"**

### Step 5: Submit for Review

1. Complete any remaining required sections
2. Click **"Submit for review"**
3. Wait for Google review (1-7 days for first submission)

---

## Part 4: Verify Everything Works

### Test Backend

1. Visit: `https://your-render-url.onrender.com/api`
2. Should show Swagger documentation
3. Test login endpoint to verify it works

### Test Mobile App

1. Install the production AAB on a test device
2. Open the app
3. Try to register/login
4. Verify API calls work
5. Test creating tasks, lists, etc.

---

## Troubleshooting

### Backend Not Deploying

- Check Render build logs for errors
- Verify environment variables are set correctly
- Check database connection string format
- Ensure `render.yaml` is in root directory

### GitHub Actions Not Triggering

- Verify `RENDER_DEPLOY_HOOK_URL` secret is set
- Check workflow file is in `.github/workflows/`
- Ensure you're pushing to `main` or `master` branch
- Check GitHub Actions tab for errors

### Mobile App Can't Connect

- Verify Render URL is correct
- Check Render service is "Live" (not sleeping)
- Test backend URL in browser first
- Rebuild app after changing API URL

### Render Service Sleeping (Free Tier)

- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- Consider upgrading to paid plan for always-on service
- Or use a service like UptimeRobot to ping your service

---

## Quick Checklist

### Backend Deployment
- [ ] Render account created
- [ ] Web service created and configured
- [ ] Environment variables added
- [ ] Service deployed and accessible
- [ ] Deploy hook URL obtained
- [ ] GitHub secret added
- [ ] CI/CD tested (push to main branch)

### Mobile App
- [ ] API URL updated to Render URL
- [ ] App rebuilt with production URL
- [ ] New AAB file downloaded
- [ ] App tested with production backend

### Play Store
- [ ] Google Play Developer account created ($25)
- [ ] App created in Play Console
- [ ] Store listing completed (screenshots, descriptions, privacy policy)
- [ ] AAB file uploaded
- [ ] App submitted for review

---

## Next Steps After Launch

1. **Monitor Backend**
   - Check Render logs regularly
   - Set up error monitoring (Sentry, etc.)
   - Monitor database usage

2. **Monitor App**
   - Check Play Console for crashes
   - Review user feedback
   - Monitor API usage

3. **Updates**
   - Backend: Push to `main` → Auto-deploys via GitHub Actions
   - Mobile: Rebuild AAB → Upload to Play Console

---

## Resources

- [Render Documentation](https://render.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [EAS Build](https://docs.expo.dev/build/introduction/)
