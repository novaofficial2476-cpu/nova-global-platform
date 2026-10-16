import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
 const token=(request.headers.get("authorization")??"").replace(/^Bearer\s+/,"");
 if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return NextResponse.json({error:"Account moderation is not configured on the server."},{status:503});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await userClient.auth.getUser(token);
 if(authError||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const {data:role}=await userClient.from("admin_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(role?.role!=="admin")return NextResponse.json({error:"Admin role required."},{status:403});
 const body=await request.json().catch(()=>null) as {targetUserId?:string;status?:"active"|"suspended"|"banned";reason?:string}|null;
 if(!body?.targetUserId||!["active","suspended","banned"].includes(body.status??""))return NextResponse.json({error:"Target user and valid status required."},{status:400});
 if(body.targetUserId===user.id && body.status!=="active")return NextResponse.json({error:"You cannot suspend or ban your own admin account."},{status:400});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:target}=await admin.from("profiles").select("id,username,account_status").eq("id",body.targetUserId).maybeSingle();
 if(!target)return NextResponse.json({error:"Profile not found."},{status:404});
 const reason=(body.reason??"").trim().slice(0,1000);
 if(body.status!=="active"&&reason.length<5)return NextResponse.json({error:"Provide a reason of at least 5 characters."},{status:400});
 const {error}=await admin.from("profiles").update({account_status:body.status,status_reason:body.status==="active"?null:reason,status_changed_at:new Date().toISOString(),status_changed_by:user.id}).eq("id",body.targetUserId);
 if(error)return NextResponse.json({error:"Could not change account status."},{status:500});
 const {error:auditError}=await admin.from("audit_logs").insert({actor_id:user.id,action:"account_"+body.status,target_type:"profile",target_id:body.targetUserId,details:{previous_status:target.account_status,new_status:body.status,reason}});
 if(auditError)return NextResponse.json({error:"Account status changed but audit logging failed; review audit logs."},{status:500});
 return NextResponse.json({ok:true,status:body.status});
}
