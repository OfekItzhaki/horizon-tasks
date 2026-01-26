# CI/CD Setup Instructions

This guide explains exactly what you need to do to make the version management CI/CD workflows work.

## Quick Setup Checklist

- [ ] Add `EXPO_TOKEN` to GitHub Secrets (for EAS builds)
- [ ] Test the "Bump Version" workflow manually
- [ ] (Optional) Set up EAS webhook for automatic triggers

## Step-by-Step Setup

### 1. Add Expo Token (Required for EAS Build Workflow)

The `eas-build-version.yml` workflow needs your Expo access token to build.

**Steps:**
1. Go to [Expo Dashboard](https://expo.dev)
2. Navigate to: **Account Settings** → **Access Tokens**
3. Click **Create Token**
4. Give it a name (e.g., "GitHub Actions")
5. Copy the token
6. Go to your GitHub repository
7. Navigate to: **Settings** → **Secrets and variables** → **Actions**
8. Click **New repository secret**
9. Name: `EXPO_TOKEN`
10. Value: Paste your Expo token
11. Click **Add secret**

### 2. Test the Version Bump Workflow

**Steps:**
1. Go to your GitHub repository
2. Click **Actions** tab
3. Find **"Bump Version"** workflow in the left sidebar
4. Click **Run workflow**
5. Select:
   - **Version type**: `patch`
   - **Apps**: `mobile`
6. Click **Run workflow**
7. Wait for it to complete
8. Check the PR it creates (or commit to develop)

### 3. (Optional) Set up EAS Webhook for Auto-Triggers

If you want version bumps to trigger automatically after EAS builds:

**Steps:**
1. Go to [Expo Dashboard](https://expo.dev) → Your Project
2. Navigate to: **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **URL**: `https://api.github.com/repos/[YOUR_USERNAME]/[YOUR_REPO]/dispatches`
     - Replace `[YOUR_USERNAME]` and `[YOUR_REPO]` with your actual GitHub username and repo name
   - **Secret**: Create a GitHub Personal Access Token with `repo` scope
     - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
     - Generate new token with `repo` scope
     - Use this as the webhook secret
   - **Events**: Select `build.complete`
5. In `.github/workflows/version-bump.yml`, uncomment:
   ```yaml
   repository_dispatch:
     types: [eas-build-complete]
   ```

## How to Use After Setup

### After Completing an Android Build:

**Option 1: Manual Version Bump (Recommended)**
1. Go to GitHub Actions → "Bump Version"
2. Run workflow with:
   - Version type: `patch` (or `minor`/`major`)
   - Apps: `mobile`
3. Review and merge the PR

**Option 2: Build + Bump Together**
1. Go to GitHub Actions → "EAS Build Version Bump"
2. Run workflow with:
   - Version type: `patch`
   - Build profile: `preview`
3. It will bump version, commit, and build automatically

**Option 3: Local Script**
```bash
cd mobile-app
node scripts/bump-version.js patch
git add package.json app.json
git commit -m "chore: bump version"
git push origin develop
```

## Troubleshooting

### Workflow Fails with "EXPO_TOKEN not found"
- Make sure you added `EXPO_TOKEN` to GitHub Secrets
- Check that the secret name is exactly `EXPO_TOKEN` (case-sensitive)

### Version Bump Creates PR but You Want Direct Commit
- The workflow commits directly to `develop` branch
- If you want PRs instead, the workflow already creates them by default
- To change behavior, edit `.github/workflows/version-bump.yml`

### EAS Build Fails
- Check that your `eas.json` is configured correctly
- Verify you have build credits available
- Check EAS build logs in Expo dashboard

## Current Status

✅ Version bump workflows are committed and ready
✅ Backend dependency issue fixed (@nestjs/swagger updated to v11)
✅ Documentation created

**Next Steps:**
1. Add `EXPO_TOKEN` secret (see Step 1 above)
2. Test the workflow (see Step 2 above)
3. Start using it after your builds!
