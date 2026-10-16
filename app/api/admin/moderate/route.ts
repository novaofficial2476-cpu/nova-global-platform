import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return NextResponse.json({ error: "Moderation action is not enabled on the server." }, { status: 503 });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const { data: role, error: roleError } = await userClient.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError || !role || !["admin", "moderator"].includes(role.role)) return NextResponse.json({ error: "Moderator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { reportId?: string; action?: string; targetType?: string; targetId?: string; note?: string } | null;
  if (!body || !["hide_post", "remove_post", "restore_post", "resolve_report"].includes(body.action ?? "")) return NextResponse.json({ error: "Unsupported moderation action." }, { status: 400 });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  if (body.action === "resolve_report") {
    if (!body.reportId) return NextResponse.json({ error: "Report ID required." }, { status: 400 });
    const { error } = await admin.from("content_reports").update({ status: "resolved", reviewed_by: user.id, reviewed_at: new Date().toISOString(), moderator_note: (body.note ?? "").slice(0, 1000) }).eq("id", body.reportId);
    if (error) return NextResponse.json({ error: "Could not update report." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body.targetType !== "post" || !body.targetId) return NextResponse.json({ error: "A post target is required." }, { status: 400 });
  const status = body.action === "hide_post" ? "hidden" : body.action === "remove_post" ? "removed" : "visible";
  const { error } = await admin.from("posts").update({ moderation_status: status }).eq("id", body.targetId);
  if (error) return NextResponse.json({ error: "Post moderation failed. Confirm the moderation migration is applied." }, { status: 500 });
  const { error: auditError } = await admin.from("audit_logs").insert({ actor_id: user.id, action: "post_" + status, target_type: "post", target_id: body.targetId, details: { note: (body.note ?? "").slice(0, 1000) } });
  if (auditError) return NextResponse.json({ error: "Post status changed, but audit logging failed. Check audit log permissions." }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
