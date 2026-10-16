# NOVA media, cache and load-test notes

## Media processing currently implemented
- Images larger than 700 KiB are resized to a maximum 1920 px edge and encoded as WebP where browser support permits. GIFs are left unchanged to preserve animation.
- Failed media uploads are retried up to three times.
- Video uploads attempt to generate a small WebP thumbnail in the browser and store it separately. If thumbnail creation fails, the video still publishes.
- Uploads use timestamped paths and a one-year cache-control max-age; do not overwrite those paths. Supabase Storage's delivery/CDN is the current media delivery layer.

## Push delivery environment
Set these server-side in Vercel:
- NEXT_PUBLIC_VAPID_PUBLIC_KEY (public key; also exposed to browser)
- VAPID_PRIVATE_KEY (secret; never prefix with NEXT_PUBLIC)
- VAPID_SUBJECT (mailto: or https: contact URI)
- SUPABASE_SERVICE_ROLE_KEY (server-only)

Then deploy, sign in as admin, enable notifications on a supported browser/device, and use **Send test push**. The sender intentionally only sends a test notification to the admin's own registered subscriptions.

Generate VAPID keys with a trusted web-push CLI or local secure environment; never commit private keys.

## Account moderation
- Admin account dashboard: /admin/accounts
- User appeal page: /appeal
- Admin-only account status and appeal review APIs require server-only SUPABASE_SERVICE_ROLE_KEY.
- Core insert actions for posts, comments, follows, likes, communities, conversations, messages and joins require account_status='active'. Audit all additional write paths and storage policies before public launch.

## Load testing
A k6 smoke/load script is provided at scripts/load-test.js. Run only against a deployment you own and during a planned test window:

```sh
k6 run -e BASE_URL=https://nova-global-platform.vercel.app scripts/load-test.js
```

The script ramps to 25 virtual users. It checks basic page/health responses only; it does not validate authenticated flows, database writes, media upload throughput, or production capacity. Review Vercel/Supabase rate limits and costs before running larger tests.
