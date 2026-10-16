"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };

export default function PwaControls() {
  const [installEvent,setInstallEvent]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    const beforeInstall=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallPromptEvent);};
    const appInstalled=()=>{setInstalled(true);setInstallEvent(null);setNotice("NOVA is installed on this device.");};
    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",appInstalled);
    if(window.matchMedia("(display-mode: standalone)").matches)setInstalled(true);
    return ()=>{window.removeEventListener("beforeinstallprompt",beforeInstall);window.removeEventListener("appinstalled",appInstalled);};
  },[]);
  async function install(){
    if(!installEvent){setNotice("If install is not offered here, open your browser menu and choose Add to Home screen.");return;}
    await installEvent.prompt();const choice=await installEvent.userChoice;
    setNotice(choice.outcome==="accepted"?"NOVA installation started.":"Installation was cancelled.");setInstallEvent(null);
  }
  async function enableNotifications(){
    if(!("Notification" in window)){setNotice("This browser does not support notifications.");return;}
    const permission=await Notification.requestPermission();
    setNotice(permission==="granted"?"Browser notification permission is enabled. Remote push delivery still requires server/provider configuration.":permission==="denied"?"Notifications are blocked in browser settings.":"Notification permission was not granted.");
  }
  return <div className="pwa-controls" aria-label="Install and notification controls">{!installed&&<button onClick={()=>void install()}>{installEvent?"Install NOVA":"Add NOVA to Home screen"}</button>}<button onClick={()=>void enableNotifications()}>Enable notifications</button>{notice&&<span role="status">{notice}</span>}</div>;
}
