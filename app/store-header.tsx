"use client";

import { ChevronDown, CircleUserRound, Headphones, Menu, Search, ShoppingCart, Sparkles, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = { userName?:string|null; cartCount?:number; onCart?:()=>void; darkTopbar?:boolean };

const groups = [
  { label:"Peças", href:"/catalogo", panel:<><div><small>FREIOS</small><a href="/catalogo?categoria=DISCO%20DE%20FREIO">Discos de freio</a><a href="/catalogo?categoria=TAMBOR%20DE%20FREIO">Tambores de freio</a><a href="/catalogo?categoria=CILINDRO%20MESTRE">Cilindros mestre</a></div><div><small>RODAGEM</small><a href="/catalogo?categoria=CUBO%20DE%20RODA">Cubos de roda</a><a href="/catalogo?eixo=DIANTEIRO">Eixo dianteiro</a><a href="/catalogo?eixo=TRASEIRO">Eixo traseiro</a></div><a className="nav-feature" href="/catalogo"><Sparkles/><span><b>Catálogo técnico</b><small>Explore todas as aplicações HighParts</small></span></a></> },
  { label:"Catálogo", href:"/catalogo", panel:<><div><small>COMO BUSCAR</small><a href="/catalogo">Todos os produtos</a><a href="/catalogo?disponiveis=1">Pronta entrega</a><a href="/catalogo?marca=VOLKSWAGEN">Peças Volkswagen</a></div><div><small>ACESSO RÁPIDO</small><a href="/catalogo?marca=FIAT">Fiat</a><a href="/catalogo?marca=CHEVROLET">Chevrolet</a><a href="/catalogo?marca=FORD">Ford</a></div><a className="nav-feature light" href="/catalogo"><Search/><span><b>Busca avançada</b><small>Filtre por carro, código e aplicação</small></span></a></> },
  { label:"Encontre sua peça", href:"/#compatibilidade", panel:<><div><small>COMPATIBILIDADE</small><Link href="/#compatibilidade">Consultar pela placa</Link><Link href="/#compatibilidade">Assistente guiado</Link><Link href="/conta">Minha garagem</Link></div><Link className="nav-feature wide" href="/#compatibilidade"><Search/><span><b>Comece pela placa</b><small>Identifique o veículo e refine a peça certa em poucos passos.</small></span></Link></> },
  { label:"Atendimento", href:"/#suporte", panel:<><div><small>AJUDA</small><a href="mailto:alisson@highparts.com.br">Fale com a HighParts</a><a href="/trocas-e-devolucoes">Trocas e devoluções</a><a href="/conta">Acompanhar pedido</a></div><a className="nav-feature light wide" href="mailto:alisson@highparts.com.br"><Headphones/><span><b>Suporte especialista</b><small>Ajuda humana para confirmar sua aplicação.</small></span></a></> },
];

export default function StoreHeader({userName,cartCount=0,onCart,darkTopbar=true}:Props){
  const [open,setOpen]=useState(false);
  const router=useRouter();
  return <>
    {darkTopbar&&<div className="topbar"><span>Catálogo técnico Hipper Freios</span><span>Compatibilidade orientada por veículo</span></div>}
    <header className="header store-header">
      <button className="mobile-menu" onClick={()=>setOpen(!open)} aria-label={open?"Fechar menu":"Abrir menu"}>{open?<X/>:<Menu/>}</button>
      <Link href="/" aria-label="HighParts — página inicial"><img className="logo" src="/highparts-logo.png" alt="HighParts"/></Link>
      <nav className={open?"open":""} aria-label="Navegação principal">{groups.map(group=><div className="nav-group" key={group.label}>
        <a className="nav-root" href={group.href}>{group.label}<ChevronDown/></a>
        <div className="nav-panel">{group.panel}</div>
      </div>)}</nav>
      <div className="header-actions"><Link className="admin-link" href={userName?"/conta":"/entrar"}><CircleUserRound/> {userName?userName.split(" ")[0]:"Entrar"}</Link><button className="cart-icon" aria-label={`Abrir carrinho com ${cartCount} itens`} onClick={onCart??(()=>router.push("/"))}><ShoppingCart/><b>{cartCount}</b></button></div>
    </header>
  </>;
}
