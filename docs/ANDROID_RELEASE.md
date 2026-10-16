# NOVA Android release checklist

The web app is a Next.js PWA. It is **not yet a signed native Android APK/AAB**. A real Android release requires a build environment, signing credentials and device testing.

## Recommended path
1. Stabilize the production web app and configure the canonical HTTPS origin.
2. Use Capacitor to wrap the web experience only after navigation, authentication, media and push flows are tested on Android WebView.
3. Add Android platform files using a local build machine or CI runner with Android SDK/Gradle installed.
4. Configure app id (for example, `online.nova.social`), app icons, splash screen, status/navigation bar behavior, deep links and secure storage as needed.
5. Implement native push integration (Firebase Cloud Messaging or another supported provider) and connect it to the server-side notification system. Browser notification permission alone does not deliver remote push.
6. Test sign-in/session persistence, file uploads, camera/gallery selection, external links, back navigation, keyboard behavior, low-memory devices and poor networks on real devices.
7. Generate a signed AAB, protect the keystore outside the repository, complete Play Console policy/data safety forms and run an internal test track before public release.

## Release blockers
- A native Android build toolchain and signing keystore are not available through the GitHub/Supabase access used for the current code changes.
- Do not publish until account deletion, privacy disclosures, moderation, RLS and push delivery have been tested end-to-end.
