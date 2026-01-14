# What to Do with Your AAB File

You have downloaded: `application-c1566290-9c95-457b-a421-07e6a42f143f.aab`

This is your **Android App Bundle** - the file you need to upload to Google Play Store.

---

## Step-by-Step Guide

### Step 1: Create Google Play Developer Account

1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the **$25 one-time registration fee**
4. Complete the registration form
5. **Wait for approval** (usually 1-2 days)

### Step 2: Create Your App

1. Once approved, click **"Create app"**
2. Fill in the form:
   - **App name**: "Tasks Management"
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
   - **Declarations**: Check all required boxes
3. Click **"Create app"**

### Step 3: Complete Store Listing (Required Before Upload)

Before you can upload your AAB, you need to complete the store listing:

#### Required Information:

1. **App icon** (512x512px)
   - ✅ You already have this: `mobile-app/assets/icon.png`
   - Upload it in Play Console

2. **Feature graphic** (1024x500px)
   - ⚠️ You need to create this
   - Can be a simple banner with app name and tagline
   - Upload in "Store listing" section

3. **Screenshots** (at least 2 required)
   - ⚠️ You need to create these
   - Take screenshots of your app running
   - Minimum 2 phone screenshots
   - 1 tablet screenshot (optional but recommended)

4. **Short description** (80 characters max)
   - Example: "Manage your daily, weekly, monthly, and yearly tasks with reminders"

5. **Full description** (up to 4000 characters)
   - Write a detailed description of your app
   - Include features, benefits, etc.

6. **Privacy Policy URL** (REQUIRED)
   - ⚠️ You must create a privacy policy
   - Host it somewhere (GitHub Pages, your website, etc.)
   - Add the URL in Play Console

### Step 4: Upload Your AAB File

1. In Play Console, go to your app
2. Click **"Production"** in the left menu
3. Click **"Create new release"**
4. Click **"Upload"** button
5. Select your `.aab` file: `application-c1566290-9c95-457b-a421-07e6a42f143f.aab`
6. Wait for upload to complete

### Step 5: Add Release Notes

1. In the release form, add **Release notes**
   - Example: "Initial release of Tasks Management app"
   - Users will see this when updating

### Step 6: Review and Submit

1. Click **"Review release"**
2. Review all information
3. Click **"Start rollout to Production"**
4. Click **"Confirm"**

### Step 7: Submit for Review

1. Go to **"Production"** tab
2. Click **"Submit for review"**
3. Complete any remaining required sections
4. Submit

---

## What Happens Next?

1. **Google Review** (1-7 days for first submission)
   - Google will review your app
   - You'll get email notifications

2. **Approval**
   - If approved, your app goes live
   - Users can download it from Play Store

3. **Rejection** (if any issues)
   - Google will email you with reasons
   - Fix issues and resubmit

---

## Important Notes

### Before Uploading:

⚠️ **Make sure your backend is deployed!**
- Your mobile app needs a backend server to work
- See `DEPLOYMENT_GUIDE.md` for backend deployment
- Update API URL in mobile app before building

⚠️ **Test your app first!**
- Build a preview APK: `eas build --platform android --profile preview`
- Install and test on your device
- Make sure everything works before uploading to Play Store

### After Uploading:

- You can't change the package name after first upload
- Version code must always increase
- Updates require new AAB builds

---

## Creating Required Assets

### Feature Graphic (1024x500px)
- Use any image editor (Photoshop, GIMP, Canva, etc.)
- Include app name and tagline
- Keep it simple and professional

### Screenshots
- Run your app on a device or emulator
- Take screenshots of:
  - Login screen
  - Lists screen
  - Tasks screen
  - Task details screen
- Use Android's screenshot feature or ADB

### Privacy Policy
- Create a simple privacy policy
- Include:
  - What data you collect (user accounts, tasks)
  - How you use it
  - How you store it (Supabase)
  - User rights
- Host on GitHub Pages or your website
- Free templates available online

---

## Quick Checklist

- [ ] Google Play Developer account created ($25)
- [ ] App created in Play Console
- [ ] Store listing completed:
  - [ ] App icon uploaded
  - [ ] Feature graphic created and uploaded
  - [ ] Screenshots taken and uploaded
  - [ ] Descriptions written
  - [ ] Privacy policy created and URL added
- [ ] AAB file uploaded
- [ ] Release notes added
- [ ] Submitted for review
- [ ] Backend server deployed (see DEPLOYMENT_GUIDE.md)
- [ ] Mobile app configured with production API URL

---

## Need Help?

- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [EAS Submit Docs](https://docs.expo.dev/submit/android/)
- [App Store Requirements](https://support.google.com/googleplay/android-developer/answer/9859152)
