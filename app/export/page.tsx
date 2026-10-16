"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export default function ExportPage() {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function exportData() {
    const supabase=getSupabase(); if(!supabase){setMessage("Database is not configured.");return;}
    setBusy(true);setMessage("");
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user) throw new Error("Please sign in first.");
      const tables=["profiles","posts","comments","follows","post_likes","notifications","community_members","communities","conversation_members","messages"];
      const result:Record<string,unknown>={exported_at:new Date().toISOString(),account_id:user.id,email:user.email??null};
      for(const table of tables){
        let query=supabase.from(table).select("*");
        if(table==="profiles") query=query.eq("id",user.id);
        else if(table==="posts") query=query.eq("author_id",user.id);
        else if(table==="comments") query=query.eq("author_id",user.id);
        else if(table==="follows") query=query.or("follower_id.eq."+user.id+",following_id.eq."+user.id);
        else if(table==="post_likes") query=query.eq("user_id",user.id);
        else if(table==="notifications") query=query.eq("user_id",user.id);
        else if(table==="community_members"||table==="conversation_members") query=query.eq("user_id",user.id);
        else if(table==="communities") query=query.eq("owner_id",user.id);
        else if(table==="messages") query=query.eq("sender_id",user.id);
        const {data,error}=await query.limit(10000);
        if(error) {result[table]={error:"Not available under current account permissions"};} else result[table]=data??[];
      }
      const blob=new Blob([JSON.stringify(result,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="nova-data-export.json";a.click();URL.revokeObjectURL(url);
      setMessage("Export file prepared. Some related records may be omitted if current row-level permissions do not allow reading them.");
    } catch(e) {setMessage(e instanceof Error?e.message:"Export failed.");} finally {setBusy(false);}
  }
  return <main className="legal-page"><Link href="/">← Back to NOVA</Link><h1>Export your data</h1><p>Download account-related data that your current session is permitted to read. The export is generated in your browser; data that database policies do not expose will not be included.</p><button disabled={busy} onClick={exportData}>{busy?"Preparing export…":"Download my data (JSON)"}</button>{message&&<p role="status">{message}</p>}</main>;
}
