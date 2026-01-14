# EAS Build Quick Start

## ⚠️ IMPORTANT: Directory Location

**You MUST run EAS commands from the `mobile-app` directory!**

```bash
# ❌ WRONG - Don't run from root directory
cd C:\Users\ofeki\Desktop\TasksManagement\TasksManagement
eas build --platform android  # ❌ Error: "Run this command inside a project directory"

# ✅ CORRECT - Run from mobile-app directory
cd C:\Users\ofeki\Desktop\TasksManagement\TasksManagement\mobile-app
eas build --platform android  # ✅ Works!
```

## Quick Commands

### 1. Navigate to mobile-app
```bash
cd mobile-app
```

### 2. Login to Expo (first time only)
```bash
eas login
```

### 3. Build for Android
```bash
# Production build (AAB for Play Store)
eas build --platform android --profile production

# Preview build (APK for testing)
eas build --platform android --profile preview

# Development build (for testing notifications)
eas build --platform android --profile development
```

### 4. Check Build Status
```bash
eas build:list
```

### 5. Submit to Play Store
```bash
eas submit --platform android
```

## Verify You're in the Right Directory

Before running EAS commands, verify:
```bash
# Check current directory
pwd  # Linux/Mac
cd   # Windows PowerShell

# Verify app.json exists
ls app.json    # Linux/Mac
dir app.json   # Windows

# Verify eas.json exists
ls eas.json    # Linux/Mac
dir eas.json   # Windows
```

If these files don't exist, you're in the wrong directory!

## Troubleshooting

### Error: "Run this command inside a project directory"
- **Solution**: Navigate to `mobile-app` directory first
- Check: `ls app.json` or `dir app.json` should show the file

### Error: "No EAS project found"
- **Solution**: Run `eas build:configure` from `mobile-app` directory
- This will set up the project with Expo

### Error: "Not logged in"
- **Solution**: Run `eas login` first

## Full Path Example (Windows)

```powershell
# From root directory
cd C:\Users\ofeki\Desktop\TasksManagement\TasksManagement\mobile-app

# Verify you're in the right place
dir app.json
dir eas.json

# Now run EAS commands
eas build --platform android --profile production
```
