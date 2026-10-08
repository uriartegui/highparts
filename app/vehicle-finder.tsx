"use client";

import { Bot, Check, ChevronLeft, ChevronRight, Disc3, Gauge, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type CatalogItem = { code:string; application:string; axle:string; product:string; type:string; hub:string; original:string };
type Vehicle = { brand:string; model:string; version:string; year:string; engine?:string|null };
type Stage = "vehicle"|"item"|"details"|"results";

const choiceMeta = [
  {label:"Disco de freio",match:"DISCO DE FREIO",icon:"◉"},
  {label:"Tambor de freio",match:"TAMBOR DE FREIO",icon:"◎"},
  {label:"Cubo de roda",match:"CUBO DE RODA",icon:"⌾"},
  {label:"Cilindro mestre",match:"CILINDRO MESTRE",icon:"▣"},
];

export default function VehicleFinder(){
  const [open,setOpen]=useState(false);
  const [stage,setStage]=useState<Stage>("vehicle");
  const [identifier,setIdentifier]=useState("");
  const [vehicle,setVehicle]=useState<Vehicle|null>(null);
  const [catalog,setCatalog]=useState<CatalogItem[]>([]);
  const [product,setProduct]=useState("");
  const [abs,setAbs]=useState("Não sei");
  const [axle,setAxle]=useState("QUALQUER");
  const [engine,setEngine]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{fetch("/catalog.json").then(r=>r.json()).then(setCatalog).catch(()=>setCatalog([]))},[]);
  const normalized=identifier.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7);
  const vehicleCatalog=useMemo(()=>{
    if(!vehicle)return [];
    const rawBrand=vehicle.brand.toUpperCase();
    const brand=rawBrand.includes("VOLKSWAGEN")||rawBrand==="VW"?"VW":rawBrand.includes("CHEVROLET")?"GM":rawBrand.split(/\s|\//)[0];
    const model=vehicle.model.toUpperCase().replace(rawBrand,"").replace(/^(VW|VOLKSWAGEN|GM|CHEVROLET)\s*[/-]?\s*/,"").trim().split(/\s|\//)[0];
    return catalog.filter(item=>{const app=item.application.toUpperCase();return app.includes(`[${brand}]`)&&app.includes(model)});
  },[catalog,vehicle]);
  const productChoices=useMemo(()=>choiceMeta.filter(choice=>vehicleCatalog.some(item=>item.product.toUpperCase().includes(choice.match))),[vehicleCatalog]);
  const relevantItems=useMemo(()=>vehicleCatalog.filter(item=>!product||item.product.toUpperCase().includes(product)),[vehicleCatalog,product]);
  const engineOptions=useMemo(()=>{const values=new Set<string>();relevantItems.forEach(item=>Array.from(item.application.matchAll(/\b(1\.[0-9]|2\.[0-9])\b/g)).forEach(match=>values.add(match[1])));return Array.from(values).sort()},[relevantItems]);
  const axleOptions=useMemo(()=>{const values:string[]=[];if(relevantItems.some(item=>item.axle.toUpperCase().includes("DIANT")))values.push("DIANT.");if(relevantItems.some(item=>item.axle.toUpperCase().includes("TRAS")))values.push("TRAS.");values.push("QUALQUER");return values},[relevantItems]);

  const lookup=()=>{
    setOpen(true);setStage("vehicle");
    if(normalized.length!==7){setError("Digite uma placa válida com 7 caracteres.");return}
    setError("");setLoading(true);
    if(normalized==="ABC1234"){setTimeout(()=>{setVehicle({brand:"Volkswagen",model:"Gol",version:"1.6",year:"2001",engine:"1.6"});setEngine("1.6");setLoading(false);setStage("item")},400);return}
    fetch("/api/vehicle/lookup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"plate",value:normalized})}).then(async response=>{const data=await response.json() as {vehicle?:Vehicle;error?:string};if(!response.ok||!data.vehicle)throw new Error(data.error||"Não foi possível identificar o veículo.");setVehicle(data.vehicle);setEngine(data.vehicle.engine||"");setStage("item")}).catch(reason=>setError(reason instanceof Error?reason.message:"Não foi possível identificar o veículo.")).finally(()=>setLoading(false));
  };
  const results=useMemo(()=>vehicleCatalog.filter(item=>{const app=item.application.toUpperCase();const prod=item.product.toUpperCase();const axleOk=axle==="QUALQUER"||item.axle.toUpperCase().includes(axle);const engineOk=!engine||app.includes(engine);const absOk=abs==="Não sei"||(abs==="Sim"?app.includes("ABS")&&!app.includes("- ABS"):!app.includes("+ ABS"));return engineOk&&prod.includes(product)&&axleOk&&absOk}).slice(0,12),[vehicleCatalog,product,abs,axle,engine]);
  const reset=()=>{setStage("vehicle");setVehicle(null);setProduct("");setError("")};

  return <>
    <section className="finder plate-finder" id="compatibilidade">
      <div className="finder-title"><strong>01</strong><span><b>BUSCA INTELIGENTE</b><small>Encontre a peça exata para seu carro</small></span></div>
      <div className="finder-lookup"><div className="lookup-label">CONSULTE PELA PLACA</div><div className="plate-input"><span>BR</span><input value={normalized} onChange={e=>setIdentifier(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()} placeholder="ABC1D23" aria-label="Placa do veículo"/></div></div>
      <div className="finder-copy"><Bot/><span>Assistente guiado<br/><b>com o catálogo HighParts</b></span></div>
      <button className="finder-action" onClick={lookup}><Search/> Encontrar minha peça</button>
    </section>

    <div className={`vehicle-overlay ${open?"show":""}`} onClick={()=>setOpen(false)}/>
    <section className={`vehicle-modal ${open?"show":""}`} aria-hidden={!open}><header><img src="/highparts-logo.png" alt="HighParts"/><span>ASSISTENTE DE COMPATIBILIDADE</span><button onClick={()=>setOpen(false)} aria-label="Fechar"><X/></button></header><div className="vehicle-progress"><i className="active"/><i className={stage!=="vehicle"?"active":""}/><i className={stage==="details"||stage==="results"?"active":""}/><i className={stage==="results"?"active":""}/></div>
      {stage==="vehicle"&&<div className="vehicle-step intro conversation"><small>PASSO 1 DE 4</small><h2>Vamos encontrar a peça certa.</h2><AssistantMessage>Primeiro, informe a placa. Assim eu identifico o veículo e faço apenas as perguntas que diferenciam as peças.</AssistantMessage><label className="big-plate"><span>BRASIL · PLACA</span><input autoFocus value={normalized} onChange={e=>setIdentifier(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()} placeholder="ABC1D23"/></label>{error&&<em className="lookup-error">{error}</em>}<button className="vehicle-next" onClick={lookup} disabled={loading}>{loading?"Identificando veículo...":"Continuar"}<ChevronRight/></button><div className="demo-hint"><Sparkles/><span><b>Experimente com ABC1234</b><small>O assistente usa as aplicações reais da planilha e identifica placas reais pela API veicular.</small></span></div></div>}
      {stage==="item"&&vehicle&&<div className="vehicle-step conversation"><small>PASSO 2 DE 4</small><div className="identified"><Check/><span><b>{vehicle.brand} {vehicle.model}</b><small>{vehicle.version} • {vehicle.year} • Placa {normalized}</small></span><button onClick={reset}>Alterar</button></div><AssistantMessage>Encontrei seu {vehicle.model}. Qual tipo de peça você está procurando?</AssistantMessage><div className="choice-grid">{productChoices.map(choice=><button key={choice.match} onClick={()=>{setProduct(choice.match);setStage("details")}}><i>{choice.icon}</i><b>{choice.label}</b><ChevronRight/></button>)}</div></div>}
      {stage==="details"&&<div className="vehicle-step conversation"><small>PASSO 3 DE 4</small><button className="step-back" onClick={()=>setStage("item")}><ChevronLeft/> Voltar</button><AssistantMessage>Agora preciso confirmar alguns detalhes que mudam a aplicação dessa peça no catálogo.</AssistantMessage><Question title="O veículo possui ABS?" value={abs} options={["Sim","Não","Não sei"]} onChange={setAbs}/><Question title="Em qual eixo vai a peça?" value={axle} options={axleOptions} labels={axleOptions.map(value=>value==="DIANT."?"Dianteiro":value==="TRAS."?"Traseiro":"Não sei")} onChange={setAxle}/>{engineOptions.length>0&&<Question title="Qual é a motorização?" value={engine} options={engineOptions} onChange={setEngine}/>}<button className="vehicle-next" onClick={()=>setStage("results")}>Ver peças compatíveis <ChevronRight/></button></div>}
      {stage==="results"&&<div className="vehicle-step results"><small>PASSO 4 DE 4</small><div className="result-head"><span><h2>{results.length} peças encontradas</h2><p>{vehicle?.brand} {vehicle?.model} {engine} • {abs==="Não sei"?"ABS não informado":`${abs==="Sim"?"Com":"Sem"} ABS`} • {axle==="DIANT."?"Dianteiro":axle==="TRAS."?"Traseiro":"Todos os eixos"}</p></span><button onClick={()=>setStage("details")}>Ajustar respostas</button></div><div className="catalog-results">{results.map(item=><article key={item.code}><div className="mini-disc"><Disc3/></div><div><small>{item.product} • {item.axle}</small><h3>{item.code}</h3><p>{item.type||"Aplicação original"}{item.hub?` • Cubo ${item.hub.toLowerCase()}`:""}</p><details><summary>Ver aplicação completa</summary><p>{item.application}</p></details></div><button onClick={()=>{window.dispatchEvent(new CustomEvent("highparts:search",{detail:item.code}));setOpen(false)}}>Ver produto <ChevronRight/></button></article>)}{!results.length&&<div className="no-result"><Gauge/><h3>Nenhum item com todos esses filtros</h3><p>Tente marcar “Não sei” em ABS ou eixo para ampliar a busca.</p><button onClick={()=>setStage("details")}>Revisar respostas</button></div>}</div><div className="catalog-note"><ShieldCheck/><span><b>Dados do catálogo HighParts</b><small>{catalog.length.toLocaleString("pt-BR")} aplicações importadas. Confirme ano e versão antes da compra.</small></span></div></div>}
    </section>
  </>;
}

function AssistantMessage({children}:{children:ReactNode}){return <div className="assistant-message"><i><Bot/></i><p>{children}</p></div>}
function Question({title,value,options,labels,onChange}:{title:string;value:string;options:string[];labels?:string[];onChange:(v:string)=>void}){return <fieldset className="vehicle-question"><legend><span>HP</span>{title}</legend><div>{options.map((option,index)=><button type="button" className={value===option?"active":""} onClick={()=>onChange(option)} key={option}>{value===option&&<Check/>}{labels?.[index]||option}</button>)}</div></fieldset>}
