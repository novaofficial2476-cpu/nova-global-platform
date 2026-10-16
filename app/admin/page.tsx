"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

type Report={id:string;reporter_id:string;target_type:string;target_id:string;reason:string;status:string;moderator_note:string|null;created_at:string};
type Audit={id:number;actor_id:string|null;action:string;target_type:string;target_id:string|null;details:Record<string,unknown>;created_at:string};

export default function AdminPage(){
 const [ready,setReady]=useState(false);const [allowed,setAllowed]=useState(false);const [reports,setReports]=useState<Report[]>([]);const [audit,setAudit]=useState<Audit[]>([]);const [tab,setTab]=useState<"reports"|"audit">("reports");const [note,setNote]=useState<Record<string,string>>({});const [notice,setNotice]=useState("");
 async function load(){
  const db=getSupabase();if(!db){setNotice("Database is not configured.");setReady(true);return;}
  const {data:{user}}=await db.auth.getUser();if(!user){setNotice("Sign in with an administrator account.");setReady(true);return;}
  const {data:role,error:roleError}=await db.from("admin_roles").select("role").eq("user_id",user.id).maybeSingle();
  if(roleError||!role||!["admin","moderator"].includes(role.role)){setNotice("Access denied. This account does not have an administrator or moderator role.");setReady(true);return;}
  setAllowed(true);
  const [{data:rep,error:repError},{data:logs,error:logError}]=await Promise.all([
   db.from("content_reports").select("id,reporter_id,target_type,target_id,reason,status,moderator_note,created_at").order("created_at",{ascending:false}).limit(100),
   db.from("audit_logs").select("id,actor_id,action,target_type,target_id,details,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  if(repError)setNotice("Reports: "+repError.message);else setReports((rep??[]) as Report[]);
  if(logError)setNotice("Audit logs: "+logError.message);else setAudit((logs??[]) as Audit[]);
  setReady(true);
 }
 useEffect(()=>{void load();},[]);
 async function updateReport(report:Report,status:"reviewing"|"resolved"|"dismissed"){
  const db=getSupabase();if(!db)return;
  const {data:{user}}=await db.auth.getUser();const {error}=await db.from("content_reports").update({status,reviewed_by:user?.id??null,reviewed_at:new Date().toISOString(),moderator_note:note[report.id]??report.moderator_note}).eq("id",report.id);
  if(error){setNotice("Could not update report: "+error.message);return;}
  setNotice("Report updated.");await load();
 }
 return <main className="legal-page admin-page"><Link href="/">← Back to NOVA</Link><h1>NOVA Admin & Moderation</h1><p>Review user reports and inspect the audit trail. This dashboard does not itself delete posts or suspend accounts.</p>{!ready&&<p>Checking administrator permissions…</p>}{notice&&<p role="status">{notice}</p>}{allowed&&<><div className="admin-tabs"><button onClick={()=>setTab("reports")}>Content reports ({reports.filter(r=>r.status==="open").length} open)</button><button onClick={()=>setTab("audit")}>Audit logs</button></div>{tab==="reports"?reports.length===0?<p>No reports found.</p>:reports.map(report=><article className="admin-report" key={report.id}><p><strong>{report.target_type}</strong> · {report.status} · {new Date(report.created_at).toLocaleString()}</p><p>Target ID: <code>{report.target_id}</code></p><p>Reason: {report.reason}</p><label htmlFor={"note-"+report.id}>Moderator note</label><input id={"note-"+report.id} value={note[report.id]??report.moderator_note??""} onChange={e=>setNote(v=>({...v,[report.id]:e.target.value}))}/><div className="admin-actions"><button onClick={()=>void updateReport(report,"reviewing")}>Mark reviewing</button><button onClick={()=>void updateReport(report,"resolved")}>Resolve</button><button onClick={()=>void updateReport(report,"dismissed")}>Dismiss</button></div></article>):audit.length===0?<p>No audit entries found.</p>:audit.map(log=><article className="admin-report" key={log.id}><p><strong>{log.action}</strong> · {log.target_type} · {new Date(log.created_at).toLocaleString()}</p><p>Actor: {log.actor_id??"system"} · Target: {log.target_id??"—"}</p><pre>{JSON.stringify(log.details,null,2)}</pre></article>)}</>}</main>;
}
