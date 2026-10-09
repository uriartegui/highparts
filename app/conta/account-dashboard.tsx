"use client";

import { FormEvent,useEffect,useState } from "react";
import { Car,CheckCircle2,LogOut,MailWarning,Package,Plus,ShoppingCart,Trash2 } from "lucide-react";

type User={id:string;name:string;email:string;role:string;phone:string;emailVerifiedAt:string|null};
type Vehicle={id:string;plate:string;brand:string;model:string;year:string;version:string;hasAbs:number|null;nickname:string};
type Order={id:string;totalCents:number;status:string;paymentProvider:string;vehiclePlate:string;shippingAddress:string;createdAt:string;itemCount:number};
const money=(c:number)=>(c/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const statusLabel:Record<string,string>={awaiting_payment:"Aguardando pagamento",paid:"Pagamento aprovado",processing:"Em separação",shipped:"Enviado",delivered:"Entregue",cancelled:"Cancelado"};

export default function AccountDashboard({user}:{user:User}){
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [showVehicle,setShowVehicle]=useState(false);
  const [message,setMessage]=useState("");
  const [sending,setSending]=useState(false);
  const load=async()=>{const [v,o]=await Promise.all([fetch("/api/account/vehicles").then(r=>r.json()),fetch("/api/account/orders").then(r=>r.json())]);setVehicles(v.vehicles??[]);setOrders(o.orders??[])};
  useEffect(()=>{load()},[]);
  async function resend(){setSending(true);const r=await fetch("/api/auth/resend-verification",{method:"POST"});const d=await r.json();setMessage(r.ok?"E-mail de confirmação enviado. Verifique também a caixa de spam.":d.error);setSending(false)}
  async function addVehicle(e:FormEvent<HTMLFormElement>){e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));const r=await fetch("/api/account/vehicles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const d=await r.json();setMessage(r.ok?"Veículo salvo na sua garagem.":d.error);if(r.ok){e.currentTarget.reset();setShowVehicle(false);load()}}
  async function removeVehicle(id:string){await fetch(`/api/account/vehicles/${id}`,{method:"DELETE"});load()}
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});location.href="/"}
  return <main className="account"><aside><img src="/highparts-logo.png" alt="HighParts"/><nav><a href="#vehicles"><Car/> Meus veículos</a><a href="#orders"><Package/> Pedidos</a><a href="/"><ShoppingCart/> Continuar comprando</a>{user.role==="admin"&&<><a href="/admin">Painel administrativo</a><a href="/admin/seguranca">Segurança e acessos</a></>}</nav><button onClick={logout}><LogOut/> Sair</button></aside><section>
    <header><small>MINHA CONTA</small><h1>Olá, {user.name.split(" ")[0]}.</h1><p>{user.email}</p></header>
    {!user.emailVerifiedAt&&<div className="verification-alert"><MailWarning/><span><b>Confirme seu e-mail</b><small>A confirmação será exigida antes de finalizar uma compra.</small></span><button onClick={resend} disabled={sending}>{sending?"Enviando...":"Reenviar confirmação"}</button></div>}
    {message&&<div className="account-message">{message}</div>}
    <div className="account-overview"><span><Car/><b>{vehicles.length}</b><small>{vehicles.length===1?"veículo salvo":"veículos salvos"}</small></span><span><Package/><b>{orders.length}</b><small>{orders.length===1?"pedido realizado":"pedidos realizados"}</small></span><span><CheckCircle2/><b>{user.emailVerifiedAt?"Verificada":"Pendente"}</b><small>segurança da conta</small></span></div>
    <article id="vehicles" className="account-card"><div className="account-card-head"><span><small>GARAGEM</small><h2>Meus veículos</h2></span><button onClick={()=>setShowVehicle(!showVehicle)}><Plus/> Adicionar veículo</button></div>{showVehicle&&<form className="vehicle-form expanded" onSubmit={addVehicle}><label>Placa<input name="plate" placeholder="ABC1D23" required maxLength={7}/></label><label>Apelido<input name="nickname" placeholder="Ex.: Meu Gol"/></label><label>Marca<input name="brand" placeholder="Ex.: Volkswagen" required/></label><label>Modelo<input name="model" placeholder="Ex.: Gol" required/></label><label>Ano<input name="year" inputMode="numeric" maxLength={4} placeholder="Ex.: 2018"/></label><label>Versão / motor<input name="version" placeholder="Ex.: 1.6 MSI"/></label><label>Possui ABS?<select name="hasAbs" defaultValue=""><option value="">Não sei</option><option value="true">Sim</option><option value="false">Não</option></select></label><button>Salvar veículo</button></form>}<div className="vehicle-list">{vehicles.length?vehicles.map(v=><div key={v.id}><Car/><span><b>{v.nickname||`${v.brand} ${v.model}`||"Meu veículo"}</b><small>{v.plate}{v.year&&` • ${v.year}`}{v.version&&` • ${v.version}`}{v.hasAbs!=null&&` • ${v.hasAbs?"Com ABS":"Sem ABS"}`}</small></span><a href={`/?vehicle=${encodeURIComponent(v.plate)}#compatibilidade`}>Buscar peças</a><button onClick={()=>removeVehicle(v.id)} aria-label={`Remover ${v.plate}`}><Trash2/></button></div>):<div className="account-empty-state"><Car/><b>Sua garagem está vazia</b><p>Salve um veículo para consultar peças com mais rapidez.</p></div>}</div></article>
    <article id="orders" className="account-card"><div className="account-card-head"><span><small>HISTÓRICO</small><h2>Minhas compras</h2></span></div>{orders.length?<div className="order-history">{orders.map(o=><div key={o.id}><span><b>#{o.id}</b><small>{new Date(o.createdAt.replace(" ","T")+"Z").toLocaleDateString("pt-BR")} • {o.itemCount} {o.itemCount===1?"item":"itens"}{o.vehiclePlate&&` • ${o.vehiclePlate}`}</small></span><strong>{money(o.totalCents)}</strong><em className={`status-${o.status}`}>{statusLabel[o.status]||o.status}</em></div>)}</div>:<div className="account-empty-state"><Package/><b>Nenhum pedido ainda</b><p>Quando você finalizar uma compra, o acompanhamento aparecerá aqui.</p><a href="/catalogo">Explorar catálogo</a></div>}</article>
  </section></main>
}
