# Store Submission Guide

## Prerequisites

### For Google Play Store (Android)
1. **Google Play Console Account** ($25 one-time fee)
   - Sign up at https://play.google.com/console
   - Create a developer account

2. **App Bundle** (not APK)
   - Already configured in `eas.json` production profile

### For Apple App Store (iOS)
1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

2. **App Store Connect Setup**
   - Create app listing
   - Set up certificates (EAS handles this automatically)

## Step 1: Build Production Version

### Android
```bash
cd mobile-app
eas build --platform android --profile production
```

This creates an **app-bundle** (AAB file) which is required for Google Play Store.

### iOS
```bash
eas build --platform ios --profile production
```

This creates an **IPA file** for App Store submission.

## Step 2: Submit to Store

### Android (Google Play Store)

1. **Make sure you have a Google Play Console account**
   - Create one at https://play.google.com/console
   - Pay the $25 registration fee

2. **Submit the build**
   ```bash
   eas submit --platform android --profile production
   ```
   
   This will:
   - Ask you to log in to Google Play Console
   - Upload the latest production build
   - Guide you through the submission process

3. **Complete Play Console setup** (first time only):
   - App name, description, screenshots
   - Privacy policy URL (required)
   - Content rating questionnaire
   - Pricing & distribution

### iOS (App Store)

1. **Make sure you have an Apple Developer account**
   - $99/year subscription required

2. **Submit the build**
   ```bash
   eas submit --platform ios --profile production
   ```
   
   This will:
   - Ask you to log in to App Store Connect
   - Upload the latest production build
   - Create/update the app listing

3. **Complete App Store Connect setup**:
   - App information, description, keywords
   - Screenshots (required for different device sizes)
   - App privacy details
   - Pricing and availability

## Important Notes

### Before Submitting

- ✅ **App Icons**: Make sure `assets/icon.png` and `assets/adaptive-icon.png` are high quality (1024x1024px)
- ✅ **Screenshots**: Prepare screenshots for different device sizes (required)
- ✅ **Privacy Policy**: Google Play requires a privacy policy URL
- ✅ **Version Number**: Currently `1.2.1` in `app.json` - will auto-increment with `autoIncrement: true`
- ✅ **Version Code**: Currently `3` for Android - EAS will handle this automatically

### Store Assets Needed

**Google Play Store:**
- Feature graphic (1024 x 500px)
- Screenshots (at least 2, up to 8)
- App icon (512 x 512px)
- Privacy policy URL

**App Store:**
- App icon (1024 x 1024px)
- Screenshots for iPhone (6.7", 6.5", 5.5" displays)
- Screenshots for iPad (12.9" and 10.5" displays) if supporting iPad
- App preview videos (optional but recommended)

## Quick Start Commands

```bash
# 1. Build Android production bundle
eas build --platform android --profile production

# 2. Submit to Google Play (after build completes)
eas submit --platform android --profile production

# 3. For iOS (repeat steps 1-2 with ios)
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

## Troubleshooting

- **Build fails**: Check EAS build logs at https://expo.dev
- **Submission fails**: Make sure you're logged into the correct store account
- **Missing credentials**: EAS will prompt you to set them up automatically

## Next Steps After Submission

1. **Testing**: Apps go through review (1-3 days typically)
2. **Internal Testing**: Set up internal test track before production release
3. **Staged Rollout**: Gradually release to users (recommended)

For more details, see:
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
