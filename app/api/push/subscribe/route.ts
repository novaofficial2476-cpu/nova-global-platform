import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({ error: "Push subscription storage is not configured on the server." }, { status: 503 });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const body = await request.json().catch(() => null) as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; [key: string]: unknown } } | null;
  const subscription = body?.subscription;
  if (!subscription || typeof subscription.endpoint !== "string" || !subscription.endpoint.startsWith("https://") || typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys?.auth !== "string") {
    return NextResponse.json({ error: "A valid browser PushSubscription is required." }, { status: 400 });
  }
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("push_subscriptions").upsert({
    user_id: user.id, endpoint: subscription.endpoint, subscription, updated_at: new Date().toISOString()
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Could not save push subscription." }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Subscription saved. Remote delivery still requires VAPID sender configuration." });
}

export async function DELETE(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({ error: "Push subscription storage is not configured." }, { status: 503 });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const body = await request.json().catch(() => null) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Endpoint required." }, { status: 400 });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: "Could not remove subscription." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
