"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";

type Profile={id:string;username:string|null;display_name:string;account_status:string;status_reason:string|null};
type Appeal={id:string;user_id:string;reason:string;status:string;created_at:string;moderator_note:string|null};

export default function AccountAdminPage(){
 const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false);
 const [profiles,setProfiles]=useState<Profile[]>([]),[appeals,setAppeals]=useState<Appeal[]>([]);
 const [query,setQuery]=useState(""),[reason,setReason]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[notice,setNotice]=useState("");
 async function load(){
  const db=getSupabase();if(!db){setNotice("Database is not configured.");setReady(true);return;}
  const {data:{user}}=await db.auth.getUser();if(!user){setNotice("Sign in with the owner admin account.");setReady(true);return;}
  const {data:role}=await db.from("admin_roles").select("role").eq("user_id",user.id).maybeSingle();
  if(role?.role!=="admin"){setNotice("Owner admin permission required.");setReady(true);return;}
  setAllowed(true);
  const [p,a]=await Promise.all([
   db.from("profiles").select("id,username,display_name,account_status,status_reason").order("created_at",{ascending:false}).limit(200),
   db.from("account_appeals").select("id,user_id,reason,status,created_at,moderator_note").order("created_at",{ascending:false}).limit(100)
  ]);
  if(p.error)setNotice("Could not load accounts: "+p.error.message);else setProfiles((p.data??[]) as Profile[]);
  if(a.error)setNotice("Could not load appeals: "+a.error.message);else setAppeals((a.data??[]) as Appeal[]);
  setReady(true);
 }
 useEffect(()=>{void load();},[]);
 async function setStatus(profile:Profile,status:"active"|"suspended"|"banned"){
  const db=getSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){setNotice("Please sign in again.");return;}
  const response=await fetch("/api/admin/account-status",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({targetUserId:profile.id,status,reason:reason[profile.id]??""})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){setNotice(result.error??"Account status change failed.");return;}
  setNotice("Account status changed to "+status+".");await load();
 }
 async function reviewAppeal(appeal:Appeal,status:"reviewing"|"approved"|"rejected"){
  const db=getSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){setNotice("Please sign in again.");return;}
  const response=await fetch("/api/admin/appeals",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({appealId:appeal.id,status,note:notes[appeal.id]??""})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){setNotice(result.error??"Appeal review failed.");return;}
  setNotice("Appeal updated.");await load();
 }
 const filtered=profiles.filter(p=>((p.username??"")+" "+p.display_name+" "+p.id).toLowerCase().includes(query.toLowerCase()));
 return <main className="legal-page admin-page"><Link href="/admin">← Back to Admin</Link><h1>Account Safety & Appeals</h1><p>Account actions are recorded in the audit log. Suspend/ban blocks will be enforced in protected server routes; review all RLS and storage paths before public launch.</p>{!ready&&<p>Checking permissions…</p>}{notice&&<p role="status">{notice}</p>}{allowed&&<>
 <h2>Accounts</h2><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search username, name or account ID"/>{filtered.map(p=><article className="admin-report" key={p.id}><p><strong>{p.display_name}</strong> · @{p.username??"no-username"}</p><p>ID: <code>{p.id}</code></p><p>Status: <strong>{p.account_status}</strong>{p.status_reason?" · "+p.status_reason:""}</p><label htmlFor={"reason-"+p.id}>Reason (required for suspend/ban)</label><input id={"reason-"+p.id} value={reason[p.id]??""} onChange={e=>setReason(v=>({...v,[p.id]:e.target.value}))}/><div className="admin-actions"><button onClick={()=>void setStatus(p,"active")}>Reactivate</button><button onClick={()=>void setStatus(p,"suspended")}>Suspend</button><button onClick={()=>void setStatus(p,"banned")}>Ban</button></div></article>)}
 <h2>Account appeals</h2>{appeals.length===0?<p>No appeals submitted.</p>:appeals.map(a=><article className="admin-report" key={a.id}><p><strong>{a.status}</strong> · {new Date(a.created_at).toLocaleString()}</p><p>User ID: <code>{a.user_id}</code></p><p>{a.reason}</p><label htmlFor={"appeal-note-"+a.id}>Admin note</label><input id={"appeal-note-"+a.id} value={notes[a.id]??a.moderator_note??""} onChange={e=>setNotes(v=>({...v,[a.id]:e.target.value}))}/><div className="admin-actions"><button onClick={()=>void reviewAppeal(a,"reviewing")}>Reviewing</button><button onClick={()=>void reviewAppeal(a,"approved")}>Approve appeal</button><button onClick={()=>void reviewAppeal(a,"rejected")}>Reject appeal</button></div></article>)}
 </>}</main>;
}
