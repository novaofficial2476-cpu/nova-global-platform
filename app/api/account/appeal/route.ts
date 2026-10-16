import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
 const token=(request.headers.get("authorization")??"").replace(/^Bearer\s+/,"");
 if(!token)return NextResponse.json({error:"Authentication required."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!anon)return NextResponse.json({error:"Database not configured."},{status:503});
 const db=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const body=await request.json().catch(()=>null) as {reason?:string}|null;
 const reason=(body?.reason??"").trim();
 if(reason.length<10||reason.length>3000)return NextResponse.json({error:"Appeal must be 10–3000 characters."},{status:400});
 const {data:profile}=await db.from("profiles").select("account_status").eq("id",user.id).maybeSingle();
 if(!profile||profile.account_status==="active")return NextResponse.json({error:"Only suspended or banned accounts can submit an appeal."},{status:400});
 const {data:existing}=await db.from("account_appeals").select("id").eq("user_id",user.id).in("status",["open","reviewing"]).limit(1);
 if(existing?.length)return NextResponse.json({error:"You already have an appeal under review."},{status:409});
 const {error:insertError}=await db.from("account_appeals").insert({user_id:user.id,reason});
 if(insertError)return NextResponse.json({error:"Could not submit appeal."},{status:500});
 return NextResponse.json({ok:true,message:"Appeal submitted for administrator review."});
}
