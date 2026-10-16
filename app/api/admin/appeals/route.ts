import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function POST(request:Request){
 const token=(request.headers.get("authorization")??"").replace(/^Bearer\s+/,"");
 if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return NextResponse.json({error:"Appeal review is not configured."},{status:503});
 const auth=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const {data:role}=await auth.from("admin_roles").select("role").eq("user_id",user.id).maybeSingle();if(role?.role!=="admin")return NextResponse.json({error:"Admin permission required."},{status:403});
 const body=await request.json().catch(()=>null) as {appealId?:string;status?:"reviewing"|"approved"|"rejected";note?:string}|null;
 if(!body?.appealId||!["reviewing","approved","rejected"].includes(body.status??""))return NextResponse.json({error:"Appeal ID and valid status required."},{status:400});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:appeal,error:readError}=await admin.from("account_appeals").select("id,user_id,status").eq("id",body.appealId).maybeSingle();
 if(readError||!appeal)return NextResponse.json({error:"Appeal not found."},{status:404});
 const now=new Date().toISOString();
 const {error:updateError}=await admin.from("account_appeals").update({status:body.status,moderator_note:(body.note??"").slice(0,1000),reviewed_by:user.id,reviewed_at:now}).eq("id",body.appealId);
 if(updateError)return NextResponse.json({error:"Could not update appeal."},{status:500});
 if(body.status==="approved"){
  const {error:profileError}=await admin.from("profiles").update({account_status:"active",status_reason:null,status_changed_at:now,status_changed_by:user.id}).eq("id",appeal.user_id);
  if(profileError)return NextResponse.json({error:"Appeal approved but account reactivation failed; correct account status manually."},{status:500});
 }
 const {error:auditError}=await admin.from("audit_logs").insert({actor_id:user.id,action:"appeal_"+body.status,target_type:"account_appeal",target_id:body.appealId,details:{user_id:appeal.user_id,note:(body.note??"").slice(0,1000)}});
 if(auditError)return NextResponse.json({error:"Appeal updated but audit logging failed."},{status:500});
 return NextResponse.json({ok:true,status:body.status});
}
