"use client";

import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export default function AppealPage(){
 const [reason,setReason]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
 useEffect(()=>{const db=getSupabase();if(!db)return;db.auth.getUser().then(async({data:{user}})=>{if(!user){setNotice("Sign in to submit an appeal.");return;}const {data}=await db.from("profiles").select("account_status,status_reason").eq("id",user.id).maybeSingle();setStatus(data?.account_status??"unknown");if(data?.status_reason)setNotice("Account status reason: "+data.status_reason);});},[]);
 async function submit(event:FormEvent){event.preventDefault();const db=getSupabase();if(!db){setNotice("Database is not configured.");return;}const {data:{session}}=await db.auth.getSession();if(!session){setNotice("Sign in to submit an appeal.");return;}setBusy(true);try{const response=await fetch("/api/account/appeal",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({reason})});const result=await response.json().catch(()=>({}));setNotice(response.ok?result.message??"Appeal submitted.":result.error??"Could not submit appeal.");if(response.ok)setReason("");}catch{setNotice("Network error. Please try again.");}finally{setBusy(false);}}
 return <main className="legal-page"><Link href="/">← Back to NOVA</Link><h1>Account Appeal</h1><p>Current account status: <strong>{status||"Checking…"}</strong></p><p>If your account was suspended or banned and you believe this was a mistake, explain why you are appealing. An administrator will review it.</p><form onSubmit={submit}><label htmlFor="appeal-reason">Your appeal (10–3000 characters)</label><textarea id="appeal-reason" minLength={10} maxLength={3000} rows={7} required value={reason} onChange={e=>setReason(e.target.value)}/><button type="submit" disabled={busy}>{busy?"Submitting…":"Submit appeal"}</button></form>{notice&&<p role="status">{notice}</p>}</main>;
}
