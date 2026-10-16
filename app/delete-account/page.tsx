"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export default function DeleteAccountPage() {
 const [confirm,setConfirm]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function requestDeletion(){
  if(confirm!=="DELETE MY ACCOUNT"){setMessage("Type DELETE MY ACCOUNT exactly to continue.");return;}
  const supabase=getSupabase();if(!supabase){setMessage("Database is not configured.");return;}
  setBusy(true);setMessage("");
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setBusy(false);setMessage("Please sign in first.");return;}
  const response=await fetch("/api/account/delete",{method:"POST",headers:{Authorization:"Bearer "+session.access_token}});
  const result=await response.json().catch(()=>({}));
  setBusy(false);
  if(!response.ok){setMessage(result.error??"Deletion could not be completed. Contact support.");return;}
  await supabase.auth.signOut();setMessage("Account deletion request completed.");
 }
 return <main className="legal-page"><Link href="/">← Back to NOVA</Link><h1>Delete your account</h1><p>This permanently requests deletion of your NOVA account and associated data. Export any data you want to keep first. Some records may need to be retained where required by law or security obligations.</p><p><Link href="/export">Export my data first</Link></p><label htmlFor="confirm-delete">Type DELETE MY ACCOUNT to confirm</label><input id="confirm-delete" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/><button disabled={busy||confirm!=="DELETE MY ACCOUNT"} onClick={requestDeletion}>{busy?"Submitting…":"Delete my account"}</button>{message&&<p role="status">{message}</p>}</main>;
}
