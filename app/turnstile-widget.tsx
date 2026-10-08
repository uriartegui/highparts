"use client";
import { useEffect,useRef,useState } from "react";

declare global { interface Window { turnstile?: { render:(element:HTMLElement,options:Record<string,unknown>)=>string; reset:(id:string)=>void } } }

export default function TurnstileWidget({onToken}:{onToken:(token:string)=>void}) {
  const container=useRef<HTMLDivElement>(null); const [siteKey,setSiteKey]=useState<string|null>(null); const rendered=useRef(false);
  useEffect(()=>{fetch("/api/auth/security-config").then(r=>r.json()).then(d=>setSiteKey(d.turnstileSiteKey)).catch(()=>{})},[]);
  useEffect(()=>{
    if(!siteKey||!container.current||rendered.current)return;
    const render=()=>{if(window.turnstile&&container.current&&!rendered.current){rendered.current=true;window.turnstile.render(container.current,{sitekey:siteKey,callback:(token:string)=>onToken(token),"expired-callback":()=>onToken(""),theme:"light"})}};
    if(window.turnstile)render(); else {const script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.onload=render;document.head.appendChild(script)}
  },[siteKey,onToken]);
  return siteKey?<div className="turnstile-wrap"><div ref={container}/></div>:null;
}
