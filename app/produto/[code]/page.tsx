"use client";

import { ArrowLeft, CarFront, CheckCircle2, ChevronRight, CircleGauge, LoaderCircle, PackageCheck, Search, ShieldCheck, ShoppingCart, Truck, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import StoreHeader from "../../store-header";

type Product={code:string;originalCode:string;product:string;application:string;axle:string;type:string;hub:string;priceCents:number|null;stockQuantity:number|null;imageUrl:string|null};
const money=(value:number)=>value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
type ApplicationGroup={brand:string;models:Array<{name:string;details:string}>};
type Vehicle={brand:string;model:string;version:string;year:string;engine:string|null};

function parseApplications(value:string):ApplicationGroup[]{
  return value.split(/(?=\[[^\]]+\])/).map(group=>group.trim()).filter(Boolean).map(group=>{
    const brand=group.match(/^\[([^\]]+)\]/)?.[1]||"Aplicação";
    const content=group.replace(/^\[[^\]]+\]\s*/,"");
    const models:Array<{name:string;details:string}>=[];
    for(const token of content.split("/").map(item=>item.trim()).filter(Boolean)){
      const match=token.match(/^([A-ZÀ-Ü][A-ZÀ-Ü0-9 .-]*?)(?=\s+\d|\s*<|\s*>|$)(.*)$/);
      if(match&&/[A-ZÀ-Ü]/.test(match[1]))models.push({name:match[1].trim(),details:match[2].trim()});
      else if(models.length)models[models.length-1].details=`${models[models.length-1].details} / ${token}`.replace(/^\s*\/\s*/,"");
      else models.push({name:token,details:""});
    }
    return {brand,models};
  });
}

const clean=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
function checkCompatibility(vehicle:Vehicle,groups:ApplicationGroup[]){
  const brand=clean(vehicle.brand)==="VOLKSWAGEN"?"VW":clean(vehicle.brand)==="CHEVROLET"?"GM":clean(vehicle.brand);
  const group=groups.find(item=>{const candidate=clean(item.brand);return candidate===brand||(brand==="VW"&&candidate==="VOLKSWAGEN")||(brand==="GM"&&candidate==="CHEVROLET")});
  if(!group)return {status:"no" as const,message:`Esta peça não possui aplicação cadastrada para ${vehicle.brand}.`};
  const model=clean(vehicle.model); const match=group.models.find(item=>{const candidate=clean(item.name);return model.startsWith(candidate)||candidate.startsWith(model)});
  if(!match)return {status:"no" as const,message:`Esta peça não possui aplicação cadastrada para ${vehicle.model}.`};
  const year=Number(vehicle.year.match(/\d{4}/)?.[0]); const ranges=[...match.details.matchAll(/(19\d{2}|20\d{2})\s*>\s*(19\d{2}|20\d{2})?/g)];
  if(year&&ranges.length){const valid=ranges.some(range=>year>=Number(range[1])&&(!range[2]||year<=Number(range[2])));if(!valid)return {status:"no" as const,message:`O modelo aparece na aplicação, mas o ano ${year} não está na faixa cadastrada.`}}
  return {status:"yes" as const,message:`Compatível com ${vehicle.brand} ${vehicle.model}${year?` ${year}`:""}, conforme a aplicação cadastrada.`};
}

export default function ProductPage(){
  const {code}=useParams<{code:string}>(); const [product,setProduct]=useState<Product|null>(null); const [loading,setLoading]=useState(true); const [cartCount,setCartCount]=useState(0); const [added,setAdded]=useState(false); const [userName,setUserName]=useState<string|null>(null); const [plate,setPlate]=useState(""); const [checking,setChecking]=useState(false); const [fitResult,setFitResult]=useState<{status:"yes"|"no"|"error";message:string;vehicle?:Vehicle}|null>(null);
  useEffect(()=>{Promise.resolve().then(()=>setCartCount((JSON.parse(localStorage.getItem("highparts_cart")||"[]") as string[]).length));fetch("/api/auth/me").then(r=>r.json()).then(x=>setUserName(x.user?.name||null)).catch(()=>{});fetch(`/api/catalog/${encodeURIComponent(code)}`).then(r=>r.ok?r.json():Promise.reject()).then(x=>setProduct(x.product)).catch(()=>setProduct(null)).finally(()=>setLoading(false))},[code]);
  function add(){if(!product||product.priceCents==null||!product.stockQuantity)return;const cart=JSON.parse(localStorage.getItem("highparts_cart")||"[]") as string[];cart.push(product.code);localStorage.setItem("highparts_cart",JSON.stringify(cart));setCartCount(cart.length);setAdded(true)}
  async function checkPlate(){if(!product)return;const normalized=plate.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7);if(normalized.length!==7){setFitResult({status:"error",message:"Digite uma placa válida com 7 caracteres."});return}setChecking(true);setFitResult(null);try{let vehicle:Vehicle;if(normalized==="ABC1234")vehicle={brand:"VW",model:"GOL",version:"1.6",year:"2001",engine:"1.6"};else{const response=await fetch("/api/vehicle/lookup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"plate",value:normalized})});const data=await response.json() as {vehicle?:Vehicle;error?:string};if(!response.ok||!data.vehicle)throw new Error(data.error||"Não foi possível consultar esta placa.");vehicle=data.vehicle}const result=checkCompatibility(vehicle,parseApplications(product.application));setFitResult({...result,vehicle})}catch(error){setFitResult({status:"error",message:error instanceof Error?error.message:"Não foi possível consultar esta placa."})}finally{setChecking(false)}}
  if(loading)return <main className="product-page"><StoreHeader cartCount={cartCount}/><div className="product-loading">Carregando produto…</div></main>;
  if(!product)return <main className="product-page"><StoreHeader cartCount={cartCount}/><div className="product-not-found"><h1>Produto não encontrado.</h1><a href="/catalogo">Voltar ao catálogo</a></div></main>;
  const available=product.priceCents!=null&&product.stockQuantity!=null&&product.stockQuantity>0;
  const applications=parseApplications(product.application);
  const technical=[{icon:<PackageCheck/>,label:"Tipo da peça",value:product.type},{icon:<CircleGauge/>,label:"Posição / eixo",value:product.axle},{icon:<CircleGauge/>,label:"Configuração do cubo",value:product.hub}].filter(item=>item.value&&item.value!=="-");
  return <main className="product-page"><StoreHeader userName={userName} cartCount={cartCount}/><div className="product-breadcrumb"><a href="/"><span>Início</span></a><ChevronRight/><a href="/catalogo"><span>Catálogo</span></a><ChevronRight/><b>{product.code}</b></div><section className="product-detail"><div className="product-gallery"><div className="product-render"><span>HIGHPARTS · {product.product}</span><div className="render-disc"/><div className="render-caliper">HP</div><b>{product.code}</b></div><small>Imagem ilustrativa. Confira as especificações e a aplicação.</small></div><div className="product-info"><a className="back-catalog" href="/catalogo"><ArrowLeft/> Voltar ao catálogo</a><small className="product-kicker">{product.product}</small><h1>{product.product}</h1><div className="product-identifiers"><span>CÓDIGO HIGHPARTS<b>{product.code}</b></span>{product.originalCode&&<span>REFERÊNCIAS ORIGINAIS<b>{product.originalCode}</b></span>}</div><div className="fit-alert"><CheckCircle2/><span><b>Compatibilidade técnica disponível</b><small>Consulte abaixo se esta peça serve especificamente no seu veículo.</small></span></div><div className="product-plate-check"><div className="plate-check-title"><CarFront/><span><b>Esta peça serve no meu carro?</b><small>Informe a placa para comparar com este produto.</small></span></div><div className="plate-check-form"><label><span>BR</span><input aria-label="Placa para verificar esta peça" value={plate} onChange={event=>{setPlate(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7));setFitResult(null)}} onKeyDown={event=>{if(event.key==="Enter")checkPlate()}} placeholder="ABC1D23" maxLength={7}/></label><button onClick={checkPlate} disabled={checking}>{checking?<LoaderCircle className="spin"/>:<Search/>}{checking?"Consultando…":"Verificar"}</button></div>{fitResult&&<div className={`plate-result ${fitResult.status}`}>{fitResult.status==="yes"?<CheckCircle2/>:<XCircle/>}<span>{fitResult.vehicle&&<b>{fitResult.vehicle.brand} {fitResult.vehicle.model} · {fitResult.vehicle.year}</b>}<p>{fitResult.message}</p></span></div>}</div><div className="product-price-box">{available?<><strong>{money(product.priceCents!/100)}</strong><span>{product.stockQuantity} unidades disponíveis</span><button onClick={add}><ShoppingCart/>{added?"Adicionado ao carrinho":"Adicionar ao carrinho"}</button></>:<><strong>Consulte disponibilidade</strong><span>O administrador ainda não publicou preço e estoque.</span><button disabled>Indisponível no momento</button></>}</div><div className="product-assurances"><span><ShieldCheck/><b>Compra protegida</b></span><span><Truck/><b>Envio calculado no checkout</b></span></div></div></section><section className="product-specs structured"><div><div className="application-heading"><span><small>COMPATIBILIDADE</small><h2>Veículos compatíveis</h2><p>Localize a marca e confirme modelo, motorização e ano.</p></span></div><div className="application-groups">{applications.map((group,index)=><article key={`${group.brand}-${index}`}><header><b>{group.brand}</b><span>{group.models.length} {group.models.length===1?"modelo":"modelos"}</span></header><div>{group.models.map((model,item)=><section key={`${model.name}-${item}`}><b>{model.name}</b>{model.details&&<span>{model.details}</span>}</section>)}</div></article>)}</div></div><aside><small>RESUMO TÉCNICO</small><div className="primary-spec"><PackageCheck/><span><small>Produto</small><b>{product.product}</b></span></div>{technical.length?technical.map(item=><Spec key={item.label} {...item}/>):<p className="technical-empty">As demais medidas técnicas serão adicionadas ao catálogo.</p>}<div className="compat-help"><CheckCircle2/><span><b>Ainda em dúvida?</b><small>Use a consulta acima antes da compra.</small></span></div></aside></section></main>
}

function Spec({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="spec-row">{icon}<span><small>{label}</small><b>{value}</b></span></div>}
