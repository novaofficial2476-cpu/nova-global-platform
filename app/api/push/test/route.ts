import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export async function POST(request:Request){
 const token=(request.headers.get("authorization")??"").replace(/^Bearer\s+/,"");
 if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
 if(!url||!anon||!service||!publicKey||!privateKey||!subject)return NextResponse.json({error:"Configure Supabase service role and NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT in Vercel before sending push."},{status:503});
 const auth=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const {data:role}=await auth.from("admin_roles").select("role").eq("user_id",user.id).maybeSingle();
 if(role?.role!=="admin")return NextResponse.json({error:"Admin permission required."},{status:403});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:subs,error:subError}=await admin.from("push_subscriptions").select("id,endpoint,subscription").eq("user_id",user.id);
 if(subError)return NextResponse.json({error:"Could not load push subscriptions."},{status:500});
 if(!subs?.length)return NextResponse.json({error:"No saved push subscription on this admin account. Enable notifications from NOVA first."},{status:404});
 webpush.setVapidDetails(subject,publicKey,privateKey);
 const payload=JSON.stringify({title:"NOVA push test",body:"Push delivery is configured correctly.",url:"/"});
 let sent=0,failed=0;
 for(const sub of subs){
  try{await webpush.sendNotification(sub.subscription as webpush.PushSubscription,payload);sent++;}
  catch(e){
   failed++;
   const status=typeof e==="object"&&e!==null&&"statusCode" in e?(e as {statusCode?:number}).statusCode:undefined;
   if(status===404||status===410)await admin.from("push_subscriptions").delete().eq("id",sub.id);
  }
 }
 await admin.from("audit_logs").insert({actor_id:user.id,action:"push_test",target_type:"push_subscription",details:{sent,failed}});
 return NextResponse.json({ok:sent>0,sent,failed,message:sent?"Push test sent to your registered devices.":"No push test could be delivered; check VAPID keys and browser subscription."},{status:sent?200:502});
}
