"use client";
import { useEffect,useRef,useState } from "react";

declare global { interface Window { turnstile?: { render:(element:HTMLElement,options:Record<string,unknown>)=>string; reset:(id:string)=>void } } }

// Turnstile tokens are single-use: bump `resetSignal` after every failed submit
// so the widget issues a fresh token instead of resending a spent one.
export default function TurnstileWidget({onToken,resetSignal=0}:{onToken:(token:string)=>void;resetSignal?:number}) {
  const container=useRef<HTMLDivElement>(null); const [siteKey,setSiteKey]=useState<string|null>(null); const rendered=useRef(false); const widgetId=useRef<string|null>(null);
  useEffect(()=>{fetch("/api/auth/security-config").then(r=>r.json()).then(d=>setSiteKey(d.turnstileSiteKey)).catch(()=>{})},[]);
  useEffect(()=>{
    if(!siteKey||!container.current||rendered.current)return;
    const render=()=>{if(window.turnstile&&container.current&&!rendered.current){rendered.current=true;widgetId.current=window.turnstile.render(container.current,{sitekey:siteKey,callback:(token:string)=>onToken(token),"expired-callback":()=>onToken(""),"error-callback":()=>onToken(""),theme:"light"})}};
    if(window.turnstile)render(); else {const script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.onload=render;document.head.appendChild(script)}
  },[siteKey,onToken]);
  useEffect(()=>{
    if(!resetSignal||!widgetId.current||!window.turnstile)return;
    onToken("");
    window.turnstile.reset(widgetId.current);
  },[resetSignal,onToken]);
  return siteKey?<div className="turnstile-wrap"><div ref={container}/></div>:null;
}
