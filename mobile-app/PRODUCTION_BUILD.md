# Building for Production & Play Store

## Development vs Production

### ⚠️ Important: Expo Go Limitations
**Expo Go no longer supports Android push notifications!** You have two options:

#### Option 1: Development Build (Recommended for Testing Notifications)
- ✅ Build a custom development client with EAS Build
- ✅ Supports all native features including notifications
- ✅ Still allows hot reload and fast iteration
- ✅ Use `expo start --dev-client` after building

#### Option 2: Continue with Expo Go (No Notifications)
- ✅ Use `expo start` and scan QR code with Expo Go app
- ✅ Fast iteration and hot reload
- ✅ ❌ **Cannot test notifications** on Android
- ⚠️ Notifications will work once you build for production

### Production (For Play Store)
- ✅ **Must use EAS Build** to create standalone app
- ✅ Creates a real `.apk` or `.aab` file
- ✅ No Expo Go dependency
- ✅ Professional standalone app
- ✅ **Full notification support**

## Steps to Test Notifications (Development Build)

Since Expo Go doesn't support Android notifications, you can build a development client:

### 1. Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Build Development Client
```bash
cd mobile-app
eas build --profile development --platform android
```

This will:
- Build a custom development client APK
- Include all native features (notifications work!)
- Takes about 10-15 minutes
- Provides download link for APK

### 4. Install Development Client
- Download the APK from EAS
- Install on your Android device
- Replace Expo Go with this custom client

### 5. Use Development Client
```bash
expo start --dev-client
```
- Scan QR code with your custom development client (not Expo Go)
- Hot reload still works!
- Notifications now work! 🔔

---

## Steps to Build for Play Store (Production)

### 4. Build Production App Bundle (AAB)
```bash
eas build --platform android --profile production
```

This will:
- Build your app on Expo's cloud servers
- Create an Android App Bundle (`.aab`) file
- Sign it with a proper certificate
- Give you a download link

### 5. Submit to Play Store

**First Time Setup:**
1. Create Google Play Developer account ($25 one-time fee)
2. Create a Google Service Account with Play Console API access
3. Download the JSON key file

**Submit:**
```bash
eas submit --platform android
```

## Important Notes

### Package Name
- Current package name: `com.tasksmanagement.app`
- **This must be unique** - change it if needed in `app.json`
- Format: `com.yourcompany.appname`

### Version Management
- Update `version` in `app.json` for each release (e.g., "1.0.1")
- `versionCode` in Android config must increment for each build
- EAS can auto-increment versionCode if configured

### Notifications
- ✅ Already configured for production builds
- ✅ Works in standalone apps (not just Expo Go)
- ✅ Uses local notifications (no server needed)

### App Signing
- EAS handles app signing automatically
- First build creates a keystore
- **Save the credentials** - you'll need them for updates

## Development Workflow

### If You Need to Test Notifications:
1. **Development**: Build dev client once (`eas build --profile development --platform android`)
2. **Development**: Use dev client (`expo start --dev-client`)
3. **Testing**: Build preview APK (`eas build --platform android --profile preview`)
4. **Production**: Build AAB (`eas build --platform android --profile production`)
5. **Submit**: Use `eas submit` or manually upload to Play Console

### If You Don't Need to Test Notifications Now:
1. **Development**: Use Expo Go (`expo start`) - faster, but no notification testing
2. **Testing**: Build preview APK when ready (`eas build --platform android --profile preview`)
3. **Production**: Build AAB (`eas build --platform android --profile production`)
4. **Submit**: Use `eas submit` or manually upload to Play Console

**Note**: Notifications will work in preview and production builds, just not in Expo Go.

## Resources

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Play Store Submission](https://docs.expo.dev/submit/android/)
- [App Signing Guide](https://docs.expo.dev/app-signing/app-credentials/)
<<<<<<< HEAD



=======
>>>>>>> main
