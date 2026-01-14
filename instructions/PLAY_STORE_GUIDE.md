# Play Store Submission Guide

## Prerequisites

1. **Expo Account**: Sign up at https://expo.dev (free)
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Google Play Developer Account**: 
   - Create at https://play.google.com/console
   - One-time fee: $25 USD
   - Wait for approval (usually 1-2 days)

## Step 1: Configure EAS

### Login to Expo
```bash
cd mobile-app
eas login
```

### Configure Project (if not already done)
```bash
eas build:configure
```

This will create/update `eas.json` (already configured ✅)

## Step 2: Update App Information

### Check `app.json`:
- ✅ Package name: `com.tasksmanagement.app` (must be unique)
- ✅ Version: `1.2.1` (update for each release)
- ✅ Version code: `3` (must increment for each build)

### Before Building:
1. Update version in `app.json` if needed
2. Increment `versionCode` for each new build
3. Ensure all assets exist (icon, splash, adaptive-icon)

## Step 3: Build Production App Bundle

### ⚠️ IMPORTANT: Run EAS commands from mobile-app directory!

**You MUST be in the `mobile-app` directory to run EAS commands.**

### Build for Android (AAB format - required for Play Store)
```bash
cd mobile-app
eas build --platform android --profile production
```

**If you get "Run this command inside a project directory" error:**
- Make sure you're in the `mobile-app` directory (not the root `TasksManagement` directory)
- Check that `app.json` and `eas.json` exist in the current directory
- Run: `pwd` (or `cd` on Windows) to verify your location

**What happens:**
- Builds on Expo's cloud servers (takes 10-20 minutes)
- Creates signed Android App Bundle (`.aab`)
- Provides download link
- First build will create and store signing credentials

**Important:** Save the credentials when prompted! You'll need them for updates.

## Step 4: Create Play Store Listing

### In Google Play Console:

1. **App Information:**
   - App name: "Tasks Management"
   - Default language: English
   - App category: Productivity
   - Free or paid: Free

2. **Store Listing:**
   - Short description (80 chars): "Manage your daily, weekly, monthly, and yearly tasks with reminders"
   - Full description (4000 chars): Write detailed description
   - Screenshots: Need at least 2 (phone), 1 (tablet)
   - Feature graphic: 1024x500px
   - App icon: 512x512px (already have ✅)

3. **Content Rating:**
   - Complete questionnaire (usually "Everyone")

4. **Privacy Policy:**
   - Required! Create one and host it
   - Add URL in Play Console

5. **Data Safety:**
   - Complete form about data collection
   - Since we use authentication, mark as "Yes" for user data

## Step 5: Upload App Bundle

### Option A: Using EAS Submit (Recommended)
```bash
# First, set up Google Service Account (one-time)
# Follow: https://docs.expo.dev/submit/android/#google-service-account

eas submit --platform android
```

### Option B: Manual Upload
1. Download the `.aab` file from EAS build page
2. Go to Play Console → Your App → Production → Create new release
3. Upload the `.aab` file
4. Add release notes
5. Review and roll out

## Step 6: Testing (Before Production Release)

### Internal Testing Track (Recommended First)
1. Create internal testing release
2. Add testers (email addresses)
3. Upload AAB to internal track
4. Testers get link to install
5. Test thoroughly before production

### Closed Testing Track
- Similar to internal, but can have more testers
- Good for beta testing

## Step 7: Production Release

Once testing is complete:
1. Go to Production track
2. Create new release
3. Upload AAB
4. Add release notes
5. Review and publish

**First release:** Can take 1-7 days for Google review
**Updates:** Usually reviewed within 24-48 hours

## Version Management

### For Each Update:
1. Update `version` in `app.json` (e.g., "1.2.2")
2. Increment `versionCode` (e.g., 4)
3. Build new AAB
4. Upload to Play Console
5. Add release notes

### Auto-increment versionCode (Optional)
Add to `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "autoIncrement": true
      }
    }
  }
}
```

## Required Assets Checklist

- [x] App icon (1024x1024) - `assets/icon.png`
- [x] Adaptive icon - `assets/adaptive-icon.png`
- [x] Splash screen - `assets/splash-icon.png`
- [ ] Screenshots (at least 2 phone, 1 tablet)
- [ ] Feature graphic (1024x500)
- [ ] Privacy policy URL

## Common Issues

### Build Fails
- Check `app.json` for syntax errors
- Ensure all assets exist
- Check EAS build logs

### Upload Rejected
- Check package name is unique
- Ensure versionCode increments
- Verify all required fields in Play Console

### App Crashes
- Test in preview build first
- Check logs in Play Console → Quality → Crashes
- Test on multiple devices

## iOS App Store (Future)

For iOS submission, you'll also need:
- Apple Developer Account ($99/year)
- Configure `app.json` iOS section
- Build with: `eas build --platform ios --profile production`
- Submit with: `eas submit --platform ios`

## Resources

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Play Store Submission](https://docs.expo.dev/submit/android/)
- [App Signing](https://docs.expo.dev/app-signing/app-credentials/)
- [Google Play Console](https://play.google.com/console)

## Quick Commands Reference

```bash
# Build production AAB
eas build --platform android --profile production

# Build preview APK (for testing)
eas build --platform android --profile preview

# Submit to Play Store
eas submit --platform android

# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```
