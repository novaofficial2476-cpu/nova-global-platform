# NOVA — One World. Your World.

NOVA is an early-stage social platform built with Next.js 15, React and Supabase. It is not yet a production-scale replacement for the major social platforms; see the checklist below for implemented code and external launch requirements.

## Stack and setup
- Next.js App Router, React, TypeScript
- Supabase Auth, Postgres and Storage
- Responsive web UI and installable PWA manifest/service worker

## Environment variables
Set these in Vercel (Production, Preview as appropriate):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, required only for account deletion. Never prefix it with NEXT_PUBLIC and never commit it.

## Routes
- `/` — social feed, profile, explore, posts, messages and communities (feature completeness varies)
- `/privacy` — privacy policy draft
- `/terms` — terms of service draft
- `/export` — browser-generated account data export, limited by current RLS permissions
- `/delete-account` — account deletion request; requires server-only Supabase service-role configuration
- `/admin` — role-gated moderation reports and audit log viewer

## Database migrations
Apply SQL migrations in the repository's Supabase migration directory in order. The NOVA moderation migration adds `admin_roles`, `content_reports`, and `audit_logs`. To grant the first administrator, use the Supabase SQL editor only after confirming the correct account UUID:
```sql
insert into public.admin_roles(user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
```
Do not expose the service-role key in client code. Review all RLS policies and test with separate customer and moderator accounts before launch.

## PWA and notifications
The manifest and service worker support installation/offline shell fallback and display incoming Web Push payloads. Actual remote push delivery still requires VAPID keys, a server-side subscription table, authenticated subscription endpoint and a push sender; browser permission alone is not a delivery service.

## Production readiness checklist
- Verify build/typecheck and all deployed routes after each deployment.
- Review Supabase Security Advisor and every RLS policy.
- Enable leaked-password protection and configure rate limits.
- Configure and test backups/restores, error monitoring, uptime checks, CDN/media processing and push delivery.
- Add native Android packaging, signing, device testing and Play Store release steps.
- Review legal drafts for the actual jurisdictions, vendors and practices.
- Test account deletion and export with test accounts before production launch.
