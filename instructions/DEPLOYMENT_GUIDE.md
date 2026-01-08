# Deployment Guide

## Overview

Your app has **two separate components** that need to be deployed:

1. **Backend Server** (NestJS API) - Must be deployed to a cloud service
2. **Mobile App** (React Native/Expo) - Built and submitted to app stores

The mobile app **connects to** the backend server via API URL.

---

## 1. Backend Server Deployment

### Option A: Render.com (Recommended - Already Configured)

You have a `render.yaml` file configured for Render.com deployment.

#### Steps:

1. **Create Render Account**
   - Go to https://render.com
   - Sign up (free tier available)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name**: `tasks-management-backend`
   - **Root Directory**: `todo-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:prod`

4. **Environment Variables** (Add in Render Dashboard)
   ```
   DATABASE_URL=your_supabase_connection_string
   DIRECT_URL=your_supabase_direct_connection_string
   PORT=3000
   JWT_SECRET=your_secret_key_here
   NODE_ENV=production
   ```

5. **Database**
   - You're already using Supabase (PostgreSQL)
   - Use the same connection strings from your `.env` file
   - Make sure to use the **pooler connection** for `DATABASE_URL`

6. **Deploy**
   - Render will automatically deploy when you push to your repository
   - Or click "Manual Deploy" → "Deploy latest commit"

7. **Get Your Backend URL**
   - After deployment, Render gives you a URL like: `https://tasks-management-backend.onrender.com`
   - **Save this URL!** You'll need it for the mobile app

### Option B: Other Platforms

#### Heroku
```bash
cd todo-backend
heroku create tasks-management-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

#### Railway
- Connect GitHub repo
- Select `todo-backend` as root directory
- Add environment variables
- Deploy

#### DigitalOcean App Platform
- Connect GitHub repo
- Configure build and start commands
- Add environment variables
- Deploy

---

## 2. Mobile App Configuration

### Update API URL for Production

Once your backend is deployed, update the mobile app to use the production URL:

**Option 1: Environment Variable (Recommended)**
```bash
# In mobile-app/.env
EXPO_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

**Option 2: Update app.json**
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-backend-url.onrender.com"
    }
  }
}
```

**Option 3: Update src/config/api.ts directly**
```typescript
baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://your-backend-url.onrender.com',
```

### Rebuild App with Production URL

After updating the API URL:
```bash
cd mobile-app
eas build --platform android --profile production
```

---

## 3. What to Do with Your AAB File

You downloaded: `application-c1566290-9c95-457b-a421-07e6a42f143f.aab`

### Step 1: Create Google Play Developer Account
- Go to https://play.google.com/console
- Pay $25 one-time fee
- Wait for approval (1-2 days)

### Step 2: Create App in Play Console
1. Click "Create app"
2. Fill in:
   - App name: "Tasks Management"
   - Default language: English
   - App or game: App
   - Free or paid: Free
   - Declarations: Check all required boxes

### Step 3: Complete Store Listing
- **App icon**: 512x512px (you have this ✅)
- **Feature graphic**: 1024x500px (create this)
- **Screenshots**: At least 2 phone screenshots
- **Short description**: 80 characters max
- **Full description**: Up to 4000 characters
- **Privacy policy**: Required! Create and host one

### Step 4: Upload AAB File
1. Go to "Production" → "Create new release"
2. Click "Upload" → Select your `.aab` file
3. Add release notes (e.g., "Initial release")
4. Click "Review release"
5. Click "Start rollout to Production"

### Step 5: Submit for Review
- Google will review your app (1-7 days for first submission)
- You'll get email notifications about status

---

## 4. Architecture Overview

```
┌─────────────────┐
│   Mobile App    │  (Built with EAS, submitted to Play Store)
│  (React Native) │
└────────┬────────┘
         │ HTTPS API Calls
         │
         ▼
┌─────────────────┐
│  Backend Server │  (Deployed on Render/Heroku/etc.)
│   (NestJS API)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Supabase DB   │  (PostgreSQL Database)
│   (Cloud Host)  │
└─────────────────┘
```

**Important Points:**
- Mobile app and backend are **separate** - they don't need to be on the same server
- Backend must be **publicly accessible** (not localhost)
- Mobile app connects via **HTTPS** in production
- Database is hosted separately on Supabase

---

## 5. Testing Production Setup

### Test Backend
```bash
# Check if backend is accessible
curl https://your-backend-url.onrender.com/api

# Should return Swagger HTML or JSON
```

### Test Mobile App
1. Build with production API URL
2. Install APK on test device
3. Test login, creating tasks, etc.
4. Verify all API calls work

---

## 6. Environment-Specific Configuration

### Development
- Backend: `http://localhost:3000` or `http://192.168.x.x:3000`
- Mobile: Uses local IP for testing

### Production
- Backend: `https://your-backend-url.onrender.com`
- Mobile: Uses production URL from environment variable

---

## 7. Monitoring & Maintenance

### Backend Monitoring
- Render dashboard shows logs and metrics
- Set up alerts for downtime
- Monitor database connection

### App Updates
1. Update backend code → Push to GitHub → Auto-deploys
2. Update mobile app → Rebuild AAB → Upload to Play Store
3. Update API URL if backend URL changes

---

## Quick Checklist

### Backend Deployment
- [ ] Create Render/Heroku account
- [ ] Deploy backend service
- [ ] Add environment variables
- [ ] Test API is accessible
- [ ] Get production URL

### Mobile App
- [ ] Update API URL to production
- [ ] Rebuild app with `eas build`
- [ ] Download new AAB file
- [ ] Test app with production backend

### Play Store
- [ ] Create Google Play Developer account
- [ ] Create app listing
- [ ] Upload AAB file
- [ ] Complete store listing
- [ ] Submit for review

---

## Resources

- [Render Deployment](https://render.com/docs)
- [Play Store Submission](https://docs.expo.dev/submit/android/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Supabase Database](https://supabase.com/docs)
