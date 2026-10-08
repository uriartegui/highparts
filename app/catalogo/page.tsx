"use client";

import { ChevronLeft, ChevronRight, Filter, PackageSearch, Search, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import StoreHeader from "../store-header";

type Product={code:string;product:string;application:string;axle:string;type:string;priceCents:number|null;stockQuantity:number|null};
type Facets={categories:string[];brands:string[];axles:string[]};
type CatalogResponse={products:Product[];total:number;facets:Facets};
const money=(value:number)=>value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function CatalogPage(){
  const initial=useSearchParams();
  const [query,setQuery]=useState(initial.get("q")||""); const [category,setCategory]=useState(initial.get("categoria")||"");
  const [brand,setBrand]=useState(initial.get("marca")||""); const [axle,setAxle]=useState(initial.get("eixo")||"");
  const [available,setAvailable]=useState(initial.get("disponiveis")==="1"); const [page,setPage]=useState(1);
  const [data,setData]=useState<CatalogResponse>({products:[],total:0,facets:{categories:[],brands:[],axles:[]}}); const [loading,setLoading]=useState(true); const [filtersOpen,setFiltersOpen]=useState(false); const [cartCount,setCartCount]=useState(0); const [userName,setUserName]=useState<string|null>(null);
  useEffect(()=>{Promise.resolve().then(()=>setCartCount((JSON.parse(localStorage.getItem("highparts_cart")||"[]") as string[]).length));fetch("/api/auth/me").then(r=>r.json() as Promise<{user?:{name:string}|null}>).then(x=>setUserName(x.user?.name||null)).catch(()=>{})},[]);
  useEffect(()=>{const timer=setTimeout(async()=>{setLoading(true);const params=new URLSearchParams({limit:"24",page:String(page),facets:"1"});if(query)params.set("q",query);if(category)params.set("category",category);if(brand)params.set("brand",brand);if(axle)params.set("axle",axle);if(available)params.set("saleOnly","1");const result=await fetch(`/api/catalog?${params}`).then(r=>r.json() as Promise<CatalogResponse>).catch(()=>({products:[],total:0,facets:{categories:[],brands:[],axles:[]}}));setData(result);setLoading(false);history.replaceState(null,"",`/catalogo?${params.toString()}`)},250);return()=>clearTimeout(timer)},[query,category,brand,axle,available,page]);
  function clear(){setQuery("");setCategory("");setBrand("");setAxle("");setAvailable(false);setPage(1)}
  function add(product:Product){if(product.priceCents==null||!product.stockQuantity)return;const cart=JSON.parse(localStorage.getItem("highparts_cart")||"[]") as string[];cart.push(product.code);localStorage.setItem("highparts_cart",JSON.stringify(cart));setCartCount(cart.length)}
  const pages=Math.max(1,Math.ceil(data.total/24)); const active=[category,brand,axle,available?"Disponíveis":""].filter(Boolean);
  return <main className="catalog-page"><StoreHeader userName={userName} cartCount={cartCount}/><section className="catalog-hero"><Link href="/"><ChevronLeft/> Voltar para a loja</Link><small>CATÁLOGO TÉCNICO HIGHPARTS</small><h1>A peça certa começa<br/>com uma busca precisa.</h1><p>Consulte códigos, aplicações e compatibilidade em todo o estoque importado.</p><label><Search/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Busque por peça, código ou veículo — ex.: Gol 1.6"/><button aria-label="Abrir filtros" onClick={()=>setFiltersOpen(true)}><SlidersHorizontal/></button></label></section>
    <div className="catalog-shell"><button className="filter-mobile" onClick={()=>setFiltersOpen(true)}><Filter/> Filtros {active.length>0&&<b>{active.length}</b>}</button><aside className={filtersOpen?"open":""}><header><div><small>REFINE A BUSCA</small><h2>Filtros</h2></div><button onClick={()=>setFiltersOpen(false)}><X/></button></header><FilterSelect label="Categoria" value={category} setValue={v=>{setCategory(v);setPage(1)}} values={data.facets.categories}/><FilterSelect label="Fabricante do veículo" value={brand} setValue={v=>{setBrand(v);setPage(1)}} values={data.facets.brands}/><FilterSelect label="Eixo" value={axle} setValue={v=>{setAxle(v);setPage(1)}} values={data.facets.axles}/><label className="availability"><input type="checkbox" checked={available} onChange={e=>{setAvailable(e.target.checked);setPage(1)}}/><span/><b>Somente pronta entrega</b></label><button className="clear-filters" onClick={clear}>Limpar todos os filtros</button></aside>
      <section className="catalog-content"><div className="catalog-summary"><div><small>CATÁLOGO COMPLETO</small><h2>{loading?"Buscando peças…":`${data.total.toLocaleString("pt-BR")} produtos encontrados`}</h2></div>{active.length>0&&<div className="active-filters">{active.map(x=><span key={String(x)}>{x}</span>)}</div>}</div>
        <div className={`catalog-grid ${loading?"loading":""}`}>{data.products.map(product=>{const canBuy=product.priceCents!=null&&product.stockQuantity!=null&&product.stockQuantity>0;return <article key={product.code}><div className="catalog-part"><span>{product.product}</span><i/><b>HP</b></div><div className="catalog-card-body"><small>{product.product} · {product.code}</small><h3>{product.product}</h3><p>{product.application}{product.axle&&` · ${product.axle}`}</p><div className="catalog-price">{canBuy?<><strong>{money(product.priceCents!/100)}</strong><span>{product.stockQuantity} em estoque</span></>:<><strong>Consulte disponibilidade</strong><span>Preço ainda não publicado</span></>}</div><button disabled={!canBuy} onClick={()=>add(product)}><ShoppingCart/>{canBuy?"Adicionar ao carrinho":"Indisponível"}</button></div></article>})}</div>
        {!loading&&!data.products.length&&<div className="catalog-zero"><PackageSearch/><h3>Nenhuma peça encontrada.</h3><p>Tente remover um filtro ou buscar por outro veículo.</p><button onClick={clear}>Limpar busca</button></div>}
        {pages>1&&<nav className="catalog-pagination" aria-label="Paginação"><button disabled={page===1} onClick={()=>{setPage(page-1);scrollTo(0,420)}}><ChevronLeft/></button><span>Página <b>{page}</b> de {pages}</span><button disabled={page===pages} onClick={()=>{setPage(page+1);scrollTo(0,420)}}><ChevronRight/></button></nav>}
      </section></div>
  </main>
}

function FilterSelect({label,value,setValue,values}:{label:string;value:string;setValue:(value:string)=>void;values:string[]}){return <label className="filter-block"><b>{label}</b><select value={value} onChange={e=>setValue(e.target.value)}><option value="">Todos</option>{values.map(item=><option key={item}>{item}</option>)}</select></label>}
