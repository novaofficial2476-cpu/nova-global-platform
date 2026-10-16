# NOVA — One World. Your World.

NOVA is an early-stage social platform prototype built with Next.js and React. This repository contains a responsive, interactive **front-end preview**.

## Current status

- Responsive home/feed UI for mobile and desktop
- Local preview interactions: search, create a temporary preview post, and appreciate/unappreciate sample posts
- Sample content is local-only and resets on refresh
- No real user accounts, persistent database, private messaging, image/video uploads, moderation backend, or production security integration yet

## Run locally

Requirements: Node.js 20.9+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Open https://vercel.com/new
2. Import `novaofficial2476-cpu/nova-global-platform`.
3. Keep the detected Next.js defaults and deploy.
4. No environment variables are needed for this UI preview.

## Planned phases

1. Deploy and verify the public UI.
2. Create a Supabase project and add secure authentication/database policies.
3. Persist profiles and posts, with server-side authorization and reporting/moderation flows.
4. Add private messaging, notifications, communities, and media storage.
5. Add video hosting/processing and additional abuse prevention as a separate phase.

Never commit secrets, API keys, service-role keys, or passwords to this public repository.
