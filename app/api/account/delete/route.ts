import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authorization=request.headers.get("authorization")??"";
  const token=authorization.startsWith("Bearer ")?authorization.slice(7):"";
  if(!token) return NextResponse.json({error:"Authentication required."},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anon||!service) return NextResponse.json({error:"Account deletion is not enabled yet. Configure SUPABASE_SERVICE_ROLE_KEY on the server before using this feature."},{status:503});
  const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await authClient.auth.getUser(token);
  if(error||!user) return NextResponse.json({error:"Invalid or expired session."},{status:401});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
  if(deleteError) return NextResponse.json({error:"Deletion failed. Please contact support."},{status:500});
  return NextResponse.json({ok:true});
}
