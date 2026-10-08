"use client";

import { ArrowLeft, CheckCircle2, ChevronRight, CircleGauge, PackageCheck, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import StoreHeader from "../../store-header";

type Product={code:string;originalCode:string;product:string;application:string;axle:string;type:string;hub:string;priceCents:number|null;stockQuantity:number|null;imageUrl:string|null};
const money=(value:number)=>value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
type ApplicationGroup={brand:string;models:Array<{name:string;details:string}>};

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

export default function ProductPage(){
  const {code}=useParams<{code:string}>(); const [product,setProduct]=useState<Product|null>(null); const [loading,setLoading]=useState(true); const [cartCount,setCartCount]=useState(0); const [added,setAdded]=useState(false); const [userName,setUserName]=useState<string|null>(null);
  useEffect(()=>{Promise.resolve().then(()=>setCartCount((JSON.parse(localStorage.getItem("highparts_cart")||"[]") as string[]).length));fetch("/api/auth/me").then(r=>r.json()).then(x=>setUserName(x.user?.name||null)).catch(()=>{});fetch(`/api/catalog/${encodeURIComponent(code)}`).then(r=>r.ok?r.json():Promise.reject()).then(x=>setProduct(x.product)).catch(()=>setProduct(null)).finally(()=>setLoading(false))},[code]);
  function add(){if(!product||product.priceCents==null||!product.stockQuantity)return;const cart=JSON.parse(localStorage.getItem("highparts_cart")||"[]") as string[];cart.push(product.code);localStorage.setItem("highparts_cart",JSON.stringify(cart));setCartCount(cart.length);setAdded(true)}
  if(loading)return <main className="product-page"><StoreHeader cartCount={cartCount}/><div className="product-loading">Carregando produto…</div></main>;
  if(!product)return <main className="product-page"><StoreHeader cartCount={cartCount}/><div className="product-not-found"><h1>Produto não encontrado.</h1><a href="/catalogo">Voltar ao catálogo</a></div></main>;
  const available=product.priceCents!=null&&product.stockQuantity!=null&&product.stockQuantity>0;
  const applications=parseApplications(product.application);
  const technical=[{icon:<PackageCheck/>,label:"Tipo da peça",value:product.type},{icon:<CircleGauge/>,label:"Posição / eixo",value:product.axle},{icon:<CircleGauge/>,label:"Configuração do cubo",value:product.hub}].filter(item=>item.value&&item.value!=="-");
  return <main className="product-page"><StoreHeader userName={userName} cartCount={cartCount}/><div className="product-breadcrumb"><a href="/"><span>Início</span></a><ChevronRight/><a href="/catalogo"><span>Catálogo</span></a><ChevronRight/><b>{product.code}</b></div><section className="product-detail"><div className="product-gallery"><div className="product-render"><span>HIGHPARTS · {product.product}</span><div className="render-disc"/><div className="render-caliper">HP</div><b>{product.code}</b></div><small>Imagem ilustrativa. Confira as especificações e a aplicação.</small></div><div className="product-info"><a className="back-catalog" href="/catalogo"><ArrowLeft/> Voltar ao catálogo</a><small className="product-kicker">{product.product}</small><h1>{product.product}</h1><div className="product-identifiers"><span>CÓDIGO HIGHPARTS<b>{product.code}</b></span>{product.originalCode&&<span>REFERÊNCIAS ORIGINAIS<b>{product.originalCode}</b></span>}</div><div className="fit-alert"><CheckCircle2/><span><b>Compatibilidade técnica disponível</b><small>Confira abaixo se o veículo, ano e versão correspondem ao seu carro.</small></span></div><div className="product-price-box">{available?<><strong>{money(product.priceCents!/100)}</strong><span>{product.stockQuantity} unidades disponíveis</span><button onClick={add}><ShoppingCart/>{added?"Adicionado ao carrinho":"Adicionar ao carrinho"}</button></>:<><strong>Consulte disponibilidade</strong><span>O administrador ainda não publicou preço e estoque.</span><button disabled>Indisponível no momento</button></>}</div><div className="product-assurances"><span><ShieldCheck/><b>Compra protegida</b></span><span><Truck/><b>Envio calculado no checkout</b></span></div></div></section><section className="product-specs structured"><div><div className="application-heading"><span><small>COMPATIBILIDADE</small><h2>Veículos compatíveis</h2><p>Localize a marca e confirme modelo, motorização e ano.</p></span><a href="/#compatibilidade">Consultar pela placa <ChevronRight/></a></div><div className="application-groups">{applications.map((group,index)=><article key={`${group.brand}-${index}`}><header><b>{group.brand}</b><span>{group.models.length} {group.models.length===1?"modelo":"modelos"}</span></header><div>{group.models.map((model,item)=><section key={`${model.name}-${item}`}><b>{model.name}</b>{model.details&&<span>{model.details}</span>}</section>)}</div></article>)}</div></div><aside><small>RESUMO TÉCNICO</small><div className="primary-spec"><PackageCheck/><span><small>Produto</small><b>{product.product}</b></span></div>{technical.length?technical.map(item=><Spec key={item.label} {...item}/>):<p className="technical-empty">As demais medidas técnicas serão adicionadas ao catálogo.</p>}<div className="compat-help"><CheckCircle2/><span><b>Ainda em dúvida?</b><small>Use a placa para confirmar a aplicação antes da compra.</small></span></div></aside></section></main>
}

function Spec({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="spec-row">{icon}<span><small>{label}</small><b>{value}</b></span></div>}
