import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return NextResponse.json(
    { status: configured ? "ok" : "degraded", app: "NOVA", timestamp: new Date().toISOString(), supabaseConfigured: configured },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
