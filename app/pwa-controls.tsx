"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };

function decodeVapidKey(value: string) {
  const padded = value.padEnd(value.length + ((4 - value.length % 4) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default function PwaControls() {
  const [installEvent,setInstallEvent]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);
  const [notice,setNotice]=useState("");
  const [pushBusy,setPushBusy]=useState(false);
  useEffect(()=>{
    const beforeInstall=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallPromptEvent);};
    const appInstalled=()=>{setInstalled(true);setInstallEvent(null);setNotice("NOVA is installed on this device.");};
    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",appInstalled);
    if(window.matchMedia("(display-mode: standalone)").matches)setInstalled(true);
    return ()=>{window.removeEventListener("beforeinstallprompt",beforeInstall);window.removeEventListener("appinstalled",appInstalled);};
  },[]);
  async function sendTestPush(){
    const db=getSupabase();if(!db){setNotice("NOVA database is not configured.");return;}
    const {data:{session}}=await db.auth.getSession();if(!session){setNotice("Sign in to test push delivery.");return;}
    setPushBusy(true);
    try{const response=await fetch("/api/push/test",{method:"POST",headers:{"Authorization":"Bearer "+session.access_token}});const result=await response.json().catch(()=>({}));setNotice(response.ok?result.message??"Push test sent.":result.error??"Push test failed.");}
    catch{setNotice("Push test failed due to a network error.");}finally{setPushBusy(false);}
  }
  async function install(){
    if(!installEvent){setNotice("If install is not offered here, open your browser menu and choose Add to Home screen.");return;}
    await installEvent.prompt();const choice=await installEvent.userChoice;
    setNotice(choice.outcome==="accepted"?"NOVA installation started.":"Installation was cancelled.");setInstallEvent(null);
  }
  async function enableNotifications(){
    if(!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)){setNotice("This browser does not support Web Push. Try an updated browser.");return;}
    const vapidKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if(!vapidKey){setNotice("Remote push is not configured yet: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing from deployment settings.");return;}
    const db=getSupabase();
    if(!db){setNotice("NOVA database is not configured.");return;}
    setPushBusy(true);
    try {
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){setNotice(permission==="denied"?"Notifications are blocked in browser settings.":"Notification permission was not granted.");return;}
      const {data:{session}}=await db.auth.getSession();
      if(!session){setNotice("Sign in before enabling push notifications.");return;}
      const registration=await navigator.serviceWorker.ready;
      const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeVapidKey(vapidKey)});
      const response=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({subscription:subscription.toJSON()})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){setNotice(result.error??"Could not save push subscription.");return;}
      setNotice("Push subscription saved. Actual delivery will work after server VAPID sender is configured.");
    } catch(error) {
      setNotice(error instanceof Error?error.message:"Could not enable push notifications.");
    } finally {setPushBusy(false);}
  }
  return <div className="pwa-controls" aria-label="Install and notification controls">{!installed&&<button onClick={()=>void install()}>{installEvent?"Install NOVA":"Add NOVA to Home screen"}</button>}<button onClick={()=>void enableNotifications()} disabled={pushBusy}>{pushBusy?"Enabling…":"Enable notifications"}</button><button onClick={()=>void sendTestPush()} disabled={pushBusy}>Send test push</button>{notice&&<span role="status">{notice}</span>}</div>;
}
