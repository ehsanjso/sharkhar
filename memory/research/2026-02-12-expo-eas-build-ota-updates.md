---
type: research
tags: [research, expo, eas-build, ota-updates, react-native, komod-ai, mobile-development]
---
# Research: Expo EAS Build & OTA Updates

## Summary

EAS (Expo Application Services) Build is a cloud-based build service that compiles React Native/Expo apps remotely, completely bypassing local hardware limitations. This directly solves the Pi 5's OOM issue with `expo export` (dying at 88%). Combined with EAS Update, you get over-the-air updates that push JS/asset changes to users in minutes without app store review.

## Why This Topic Now

From today's memory (Feb 12):
> "Pi struggles with `npx expo export -p web` (gets OOM killed at ~88%)"

This is a blocker for Komod AI production builds. EAS Build offloads compilation to Expo's cloud infrastructure — the Pi just uploads source code and receives a ready-to-install binary.

## Key Findings

### EAS Build — Cloud Builds That Work

- **No local resources needed** — Builds run on Google Cloud (Android) and Expo macOS cloud (iOS)
- **Handles signing credentials** — Auto-generates/manages keystores and provisioning profiles
- **Three build profiles** out of the box:
  - `development` — Debug builds with dev tools, installable via URL
  - `preview` — Production-like builds for internal testing (APK/ad hoc)
  - `production` — Store-ready AAB/IPA for submission
- **Internal distribution** — Share builds via URL, no TestFlight/Play Console needed for testing
- **CI integration** — Works with GitHub Actions, any CI via `--non-interactive`

### EAS Update — OTA Like Magic

- **Push JS/asset changes instantly** — No app store review for bug fixes
- **Channels** — Route updates to specific build types (preview vs production)
- **Rollouts** — Deploy to percentage of users gradually
- **Republish** — Revert bad updates by republishing stable version
- **React hook** — `useUpdates()` for custom update UX in-app

### What EAS Update CAN Fix (OTA)
- JavaScript code changes
- Styling/CSS updates
- Image assets
- Screen layouts
- Translations/copy
- Bug fixes in JS

### What Requires New Build
- Native code changes
- New native dependencies
- App permissions
- Expo SDK version upgrades
- Anything in `ios/` or `android/` directories

### Pricing (Free Tier)
- **30 builds/month** included on free plan
- **1,000 update MAUs** free
- More than enough for solo development
- Production/Enterprise tiers available when needed

## Quick Start for Komod AI

### 1. Install EAS CLI (already have npm global access)
```bash
npm install -g eas-cli
eas login
```

### 2. Configure project
```bash
cd /projects/komod-ai
eas build:configure
```

This creates `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### 3. Create first build (from Pi — just uploads code!)
```bash
# Preview build for testing on device
eas build --platform android --profile preview

# Or both platforms
eas build --platform all --profile preview
```

### 4. Install on device
- Build completes → Expo sends URL
- Open URL on phone → Download & install APK
- No Play Store needed for testing!

### 5. Set up OTA updates
```bash
npx expo install expo-updates
eas update:configure
```

### 6. Push an update
```bash
# After making JS changes
eas update --channel preview --message "Fix wardrobe card layout"
```

Users get the update on next app launch — no new build needed!

## Practical Applications for Ehsan

### Immediate Wins
1. **Bypass Pi OOM** — Cloud builds = no more 88% crash
2. **Test on real device** — Preview builds installable via URL
3. **Share with testers** — Send link, they install directly
4. **Iterate faster** — OTA updates for JS changes in minutes

### Workflow Evolution
```
Current (blocked):
  Code → expo export → OOM → stuck

With EAS:
  Code → eas build (cloud) → URL → Install on device
       ↓
  JS fix → eas update → Users get it in minutes
```

### Integration with Current Stack
- **GitHub Actions** — Auto-build on push to main
- **Mission Control** — Could show build status, update deployments
- **Uptime Kuma** — Monitor EAS service availability

## eas.json Configuration for Komod AI

Recommended setup for a production-ready workflow:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "APP_VARIANT": "preview"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  }
}
```

## Resources

### Official Documentation
- [EAS Build Introduction](https://docs.expo.dev/build/introduction/)
- [Create Your First Build](https://docs.expo.dev/build/setup/)
- [Internal Distribution](https://docs.expo.dev/build/internal-distribution/)
- [EAS Update Getting Started](https://docs.expo.dev/eas-update/getting-started/)
- [eas.json Reference](https://docs.expo.dev/eas/json/)

### Tutorials
- [EAS Build Tutorial Series](https://docs.expo.dev/tutorial/eas/introduction/)
- [Internal Distribution Tutorial](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/)

### Tools
- **Expo Orbit** — Desktop app to install builds/updates on devices
- **expo-dev-client** — Enhanced dev experience with custom native code
- **EAS Workflows** — CI/CD automation within Expo ecosystem

## Next Steps

1. **Quick win today:**
   ```bash
   npm install -g eas-cli && eas login
   cd /projects/komod-ai && eas build:configure
   ```

2. **First cloud build:**
   ```bash
   eas build --platform android --profile preview
   ```
   This will work from Pi — just uploads code!

3. **Install expo-updates:**
   ```bash
   npx expo install expo-updates
   eas update:configure
   ```

4. **Test OTA flow:**
   - Make a small change
   - `eas update --channel preview --message "test update"`
   - Force close app, reopen → See change!

5. **Consider:** GitHub Action to auto-build on push to `main`

## Bottom Line

EAS Build removes the Pi 5 as a bottleneck for mobile development. The free tier (30 builds/month) is plenty for personal projects. Combined with EAS Update for instant JS fixes, this gives Komod AI a professional deployment pipeline without any infrastructure management.

The Pi's job shifts from "build machine" to "development server + code editor" — which it handles perfectly.
