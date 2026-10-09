"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Car,
  Check,
  ChevronRight,
  ListFilter,
  MessageCircle,
  PackageCheck,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  X,
  Zap,
} from "lucide-react";
import VehicleFinder from "./vehicle-finder";
import StoreHeader from "./store-header";
import catalogSource from "@/public/catalog.json";

type Product = {
  id: string;
  name: string;
  category: string;
  fit: string;
  price: number | null;
  stock: number | null;
  badge?: string;
  tone: string;
};
type ApiProduct = {
  code: string;
  product: string;
  application: string;
  axle: string;
  type: string;
  priceCents: number | null;
  stockQuantity: number | null;
};
type StaticProduct = {
  code: string;
  product: string;
  application: string;
  axle: string;
  type: string;
};
const mapProduct = (p: ApiProduct): Product => ({
  id: p.code,
  name: p.product,
  category: p.product,
  fit: `${p.application}${p.axle ? ` • ${p.axle}` : ""}`,
  price: p.priceCents == null ? null : p.priceCents / 100,
  stock: p.stockQuantity,
  badge:
    p.priceCents != null && p.stockQuantity && p.stockQuantity > 0
      ? "Disponível"
      : undefined,
  tone: "#e31b2d",
});
const initialProducts = (catalogSource as StaticProduct[])
  .slice(0, 60)
  .map((p) => mapProduct({ ...p, priceCents: null, stockQuantity: null }));
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PartVisual({ product }: { product: Product }) {
  return (
    <div
      className="part"
      style={{ "--tone": product.tone } as React.CSSProperties}
    >
      <i />
      <b>{product.category}</b>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [cartReady, setCartReady] = useState(false);
  useEffect(() => {
    (async () => {
      const catalog = await fetch("/api/catalog?limit=60")
        .then((r) => r.json() as Promise<{ products?: ApiProduct[] }>)
        .catch(() => ({ products: [] }));
      const mapped = (catalog.products || []).map(mapProduct);
      if (mapped.length) setProducts(mapped);
      const known = mapped.length ? mapped : initialProducts;
      const local = JSON.parse(
        localStorage.getItem("highparts_cart") || "[]",
      ) as string[];
      const me = await fetch("/api/auth/me")
        .then((r) => r.json() as Promise<{ user: { name: string } | null }>)
        .catch(() => ({ user: null }));
      setUser(me.user);
      if (me.user) {
        const saved = await fetch("/api/account/cart")
          .then(
            (r) =>
              r.json() as Promise<{
                items?: Array<{ itemKey: string; quantity: number }>;
              }>,
          )
          .catch(() => ({ items: [] }));
        const remote = (saved.items || [])
          .flatMap((item) =>
            Array.from({ length: item.quantity }, () => String(item.itemKey)),
          )
          .filter((id: string) => known.some((p: Product) => p.id === id));
        setCart(
          remote.length
            ? remote
            : local.filter((id) => known.some((p: Product) => p.id === id)),
        );
      } else
        setCart(local.filter((id) => known.some((p: Product) => p.id === id)));
      setCartReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!cartReady) return;
    localStorage.setItem("highparts_cart", JSON.stringify(cart));
    if (user) {
      const grouped = [...new Set(cart)].map((id) => {
        const p = products.find((product) => product.id === id)!;
        return {
          itemKey: id,
          name: p.name,
          fit: p.fit,
          priceCents: Math.round((p.price ?? 0) * 100),
          quantity: cart.filter((item) => item === id).length,
        };
      });
      fetch("/api/account/cart", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: grouped }),
      });
    }
  }, [cart, cartReady, user, products]);
  const featured = products
    .filter((p) => p.price != null && p.stock != null && p.stock > 0)
    .slice(0, 6);
  const items = cart
    .map((id) => products.find((p) => p.id === id)!)
    .filter(Boolean);
  const subtotal = items.reduce((s, p) => s + (p.price ?? 0), 0);
  if (checkout)
    return (
      <Checkout
        items={items}
        subtotal={subtotal}
        onBack={() => setCheckout(false)}
      />
    );
  return (
    <main>
      <StoreHeader
        userName={user?.name}
        cartCount={cart.length}
        onCart={() => setCartOpen(true)}
      />
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <div className="eyebrow">
            <Zap /> ENCONTRE A PEÇA CERTA, SEM ADIVINHAÇÃO
          </div>
          <h1>
            PRECISÃO PARA
            <br />
            SEGUIR <em>ALÉM.</em>
          </h1>
          <p>
            Catálogo técnico, busca orientada pelo seu veículo e uma experiência
            de compra criada para transmitir confiança.
          </p>
          <div className="hero-cta">
            <a className="primary" href="#compatibilidade">
              Buscar pela placa <ChevronRight />
            </a>
            <a className="secondary" href="/catalogo">
              Explorar catálogo
            </a>
          </div>
          <div className="proof">
            <div>
              <b>Seguro</b>
              <span>conta protegida</span>
            </div>
            <div>
              <b>Preciso</b>
              <span>catálogo técnico</span>
            </div>
            <div>
              <b>Humano</b>
              <span>suporte especialista</span>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <div className="disc" />
          <div className="caliper">
            HP<span>HIGH PERFORMANCE</span>
          </div>
          <div className="float">
            <ShieldCheck />
            <span>
              Compatibilidade
              <br />
              <b>orientada</b>
            </span>
          </div>
        </div>
      </section>
      <VehicleFinder />
      {/* The full catalog now lives on /catalogo to keep the home focused. */}
      {/*
    <section className="section" id="categorias"><Title kicker="ESCOLHA SUA CATEGORIA" title="Tudo para o seu projeto."/><div className="category-grid">{categories.slice(1).map((c,i)=><button key={c} onClick={()=>{setCategory(c);document.querySelector("#ofertas")?.scrollIntoView({behavior:"smooth"})}}><i>{["◉","⌁","⚙","ϟ","◎","✦"][i]}</i><b>{c}</b><small>{products.filter(p=>p.category===c).length} produtos carregados</small><ChevronRight/></button>)}</div></section>
    <section className="section products" id="ofertas"><div className="section-head"><Title kicker="CATÁLOGO HIGHPARTS" title="Peças do estoque real."/><label className="search"><Search/><input aria-label="Buscar no catálogo" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar peça ou veículo"/><SlidersHorizontal/></label></div><div className="chips">{categories.map(c=><button className={category===c?"active":""} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div><div className="product-grid">{filtered.map(p=>{const available=p.price!=null&&p.stock!=null&&p.stock>0;return <article className="product" key={p.id}>{p.badge&&<span className="badge">{p.badge}</span>}<PartVisual product={p}/><div className="product-body"><small>{p.category} • {p.id}</small><h3>{p.name}</h3><p>{p.fit}</p><div className="price">{available?<><b>{money(p.price!)}</b><span>{p.stock} unidades disponíveis</span></>:<><b>Consulte disponibilidade</b><span>Preço e estoque serão publicados pelo administrador</span></>}</div><button className="buy" disabled={!available} onClick={()=>{if(available){setCart([...cart,p.id]);setCartOpen(true)}}}><ShoppingCart/> {available?"Adicionar ao carrinho":"Indisponível"}</button></div></article>})}</div>{(catalogLoading||!filtered.length)&&<p className="empty">{catalogLoading?"Carregando catálogo...":"Nenhuma peça encontrada."}</p>}</section>
    */}
      <section className="section home-journey">
        <div className="journey-heading">
          <Title kicker="SIMPLES E SEGURO" title="Da placa à peça certa." />
          <p>
            A HighParts cruza os dados do seu veículo com as aplicações técnicas
            do catálogo para reduzir dúvidas antes da compra.
          </p>
        </div>
        <div className="journey-steps">
          <article>
            <i>01</i>
            <SearchCheck />
            <h3>Informe a placa</h3>
            <p>Identificamos marca, modelo, versão e ano do veículo.</p>
          </article>
          <article>
            <i>02</i>
            <MessageCircle />
            <h3>Responda às perguntas</h3>
            <p>ABS, motorização e eixo refinam a busca quando necessário.</p>
          </article>
          <article>
            <i>03</i>
            <Check />
            <h3>Confira a compatibilidade</h3>
            <p>Veja somente as peças que correspondem ao seu carro.</p>
          </article>
        </div>
      </section>
      <section className="section shopping-paths" id="categorias">
        <div className="path-copy">
          <Title
            kicker="ESCOLHA SEU CAMINHO"
            title="Como você prefere buscar?"
          />
          <p>
            A consulta pela placa é a opção mais rápida. Se já conhece a peça ou
            o código, acesse o catálogo completo.
          </p>
        </div>
        <div className="path-grid">
          <a className="path-card primary-path" href="#compatibilidade">
            <span>
              <Car />
            </span>
            <small>RECOMENDADO</small>
            <h3>Encontrar pela placa</h3>
            <p>
              Conte qual é o seu carro e deixe o assistente filtrar as
              aplicações compatíveis.
            </p>
            <b>
              Iniciar consulta <ChevronRight />
            </b>
          </a>
          <a className="path-card" href="/catalogo">
            <span>
              <ListFilter />
            </span>
            <small>CATÁLOGO COMPLETO</small>
            <h3>Buscar por peça ou código</h3>
            <p>
              Use filtros técnicos, marca do veículo, aplicação ou código
              HighParts.
            </p>
            <b>
              Explorar catálogo <ChevronRight />
            </b>
          </a>
        </div>
      </section>
      {featured.length > 0 && (
        <section className="section products home-featured">
          <div className="featured-head">
            <Title kicker="DISPONÍVEIS AGORA" title="Peças em destaque." />
            <a href="/catalogo">
              Ver catálogo completo <ChevronRight />
            </a>
          </div>
          <div className="product-grid">
            {featured.map((p) => (
              <article className="product" key={p.id}>
                <span className="badge">Disponível</span>
                <PartVisual product={p} />
                <div className="product-body">
                  <small>
                    {p.category} • {p.id}
                  </small>
                  <h3>{p.name}</h3>
                  <p>{p.fit}</p>
                  <div className="price">
                    <b>{money(p.price!)}</b>
                    <span>{p.stock} unidades disponíveis</span>
                  </div>
                  <button
                    className="buy"
                    onClick={() => {
                      setCart([...cart, p.id]);
                      setCartOpen(true);
                    }}
                  >
                    <ShoppingCart /> Adicionar ao carrinho
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="home-help">
        <div>
          <small>AINDA EM DÚVIDA?</small>
          <h2>Comece pela placa do seu carro.</h2>
          <p>
            Nosso assistente ajuda você a chegar à aplicação correta antes de
            escolher o produto.
          </p>
        </div>
        <a href="#compatibilidade">
          Consultar agora <ChevronRight />
        </a>
      </section>
      <section className="benefits">
        <Benefit
          icon={<Truck />}
          title="Envio rápido"
          text="Despacho em até 24h úteis"
        />
        <Benefit
          icon={<ShieldCheck />}
          title="Compra protegida"
          text="Ambiente seguro e criptografado"
        />
        <Benefit
          icon={<PackageCheck />}
          title="Peças selecionadas"
          text="Qualidade e procedência"
        />
        <Benefit
          icon={<Star />}
          title="Suporte especialista"
          text="Ajuda para escolher a peça certa"
        />
      </section>
      <footer className="store-footer" id="suporte">
        <div className="footer-main">
          <div className="footer-brand">
            <img src="/highparts-logo.png" alt="HighParts" />
            <p>Performance, confiança e a peça certa para o seu carro.</p>
            <span>
              Compatibilidade técnica para comprar com mais segurança.
            </span>
          </div>
          <div className="footer-column">
            <b>COMPRAR</b>
            <a href="/catalogo">Catálogo completo</a>
            <a href="#compatibilidade">Buscar pela placa</a>
            <a href="/conta">Minha garagem</a>
            <a href="/conta">Meus pedidos</a>
          </div>
          <div className="footer-column">
            <b>ATENDIMENTO</b>
            <a href="mailto:alisson@highparts.com.br">Fale com a HighParts</a>
            <a href="/trocas-e-devolucoes">Trocas e devoluções</a>
            <a href="/privacidade">Política de privacidade</a>
            <a href="/termos">Termos de uso</a>
          </div>
          <div className="footer-contact">
            <b>PRECISA DE AJUDA?</b>
            <h3>Confirme antes de comprar.</h3>
            <p>
              Nossa equipe ajuda a verificar a aplicação correta para o seu
              veículo.
            </p>
            <a href="mailto:alisson@highparts.com.br">
              alisson@highparts.com.br <ChevronRight />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <small>© 2026 HighParts. Todos os direitos reservados.</small>
          <small>Catálogo sujeito à disponibilidade de estoque.</small>
        </div>
      </footer>
      <div
        className={`overlay ${cartOpen ? "show" : ""}`}
        onClick={() => setCartOpen(false)}
      />
      <aside className={`drawer ${cartOpen ? "show" : ""}`}>
        <header>
          <div>
            <small>SEU CARRINHO</small>
            <h2>
              {cart.length} {cart.length === 1 ? "item" : "itens"}
            </h2>
          </div>
          <button onClick={() => setCartOpen(false)}>
            <X />
          </button>
        </header>
        {!items.length ? (
          <div className="cart-empty">
            <ShoppingCart />
            <h3>Seu carrinho está vazio</h3>
            <p>Adicione peças e elas aparecerão aqui.</p>
            <button onClick={() => (location.href = "/catalogo")}>
              Explorar catálogo
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((p, i) => (
                <div className="cart-item" key={`${p.id}-${i}`}>
                  <PartVisual product={p} />
                  <span>
                    <b>{p.name}</b>
                    <small>{p.fit}</small>
                    <strong>{money(p.price ?? 0)}</strong>
                  </span>
                  <button
                    onClick={() => setCart(cart.filter((_, n) => n !== i))}
                  >
                    <X />
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <p>
                <span>Subtotal</span>
                <b>{money(subtotal)}</b>
              </p>
              <small>Frete calculado no checkout</small>
              <button
                onClick={() => {
                  setCartOpen(false);
                  setCheckout(true);
                }}
              >
                Ir para o checkout <ChevronRight />
              </button>
              <em>
                <ShieldCheck /> Compra segura
              </em>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}

function Title({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="title">
      <small>{kicker}</small>
      <h2>{title}</h2>
    </div>
  );
}
function Benefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div>
      {icon}
      <span>
        <b>{title}</b>
        <small>{text}</small>
      </span>
    </div>
  );
}

function Checkout({
  items,
  subtotal,
  onBack,
}: {
  items: Product[];
  subtotal: number;
  onBack: () => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addresses,setAddresses]=useState<Array<{id:string;label:string;postalCode:string;street:string;number:string;complement:string;neighborhood:string;city:string;state:string;isDefault:number}>>([]);
  const [vehicles,setVehicles]=useState<Array<{id:string;plate:string;brand:string;model:string;nickname:string}>>([]);
  const [selectedAddress,setSelectedAddress]=useState("");
  const [selectedVehicle,setSelectedVehicle]=useState("");
  const [cepLoading,setCepLoading]=useState(false);
  const [delivery,setDelivery]=useState({postalCode:"",street:"",number:"",complement:"",neighborhood:"",city:"",state:""});
  useEffect(()=>{Promise.all([fetch("/api/account/addresses").then(r=>r.ok?r.json():{addresses:[]}),fetch("/api/account/vehicles").then(r=>r.ok?r.json():{vehicles:[]})]).then(([a,v])=>{const list=a.addresses??[];setAddresses(list);setVehicles(v.vehicles??[]);const preferred=list.find((item:{isDefault:number})=>item.isDefault)||list[0];if(preferred){setSelectedAddress(preferred.id);setDelivery(preferred)}})},[]);
  function chooseAddress(id:string){setSelectedAddress(id);const address=addresses.find(item=>item.id===id);if(address)setDelivery(address)}
  async function lookupCheckoutCep(value:string){const cep=value.replace(/\D/g,"").slice(0,8);setSelectedAddress("");setDelivery(current=>({...current,postalCode:cep}));if(cep.length!==8)return;setCepLoading(true);try{const data=await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r=>r.json()) as {erro?:boolean;logradouro?:string;bairro?:string;localidade?:string;uf?:string};if(data.erro)throw new Error();setDelivery(current=>({...current,postalCode:cep,street:data.logradouro||"",neighborhood:data.bairro||"",city:data.localidade||"",state:data.uf||""}))}catch{setError("CEP não encontrado. Confira o número ou preencha o endereço manualmente.")}finally{setCepLoading(false)}}
  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const grouped = [...new Set(items.map((p) => p.id))].map((id) => ({
      itemKey: id,
      quantity: items.filter((x) => x.id === id).length,
    }));
    const response = await fetch("/api/account/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: fields.phone,
        postalCode: delivery.postalCode,
        address: `${delivery.street}, ${delivery.number}${delivery.complement?`, ${delivery.complement}`:""} - ${delivery.neighborhood?`${delivery.neighborhood}, `:""}${delivery.city}/${delivery.state}`,
        vehiclePlate: selectedVehicle,
        items: grouped,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      order?: { id: string };
    };
    if (response.status === 401) {
      location.href = "/entrar?returnTo=/";
      return;
    }
    if (!response.ok || !result.order) {
      setError(result.error ?? "Não foi possível criar o pedido.");
      setSaving(false);
      return;
    }
    setOrderId(result.order.id);
  }
  if (orderId)
    return (
      <main className="checkout">
        <div className="success">
          <i>
            <Check />
          </i>
          <small>PEDIDO RECEBIDO</small>
          <h1>Pedido salvo!</h1>
          <p>
            Pedido <b>#{orderId}</b> criado. Ele ficará aguardando pagamento até
            conectarmos o provedor.
          </p>
          <a href="/conta">Acompanhar em minha conta</a>
          <button onClick={onBack}>Voltar para a loja</button>
        </div>
      </main>
    );
  return (
    <main className="checkout">
      <header>
        <img src="/highparts-logo.png" alt="HighParts" />
        <button onClick={onBack}>← Continuar comprando</button>
        <span>
          <ShieldCheck /> Checkout seguro
        </span>
      </header>
      <div className="checkout-grid">
        <form onSubmit={finish}>
          <small>FINALIZAR COMPRA</small>
          <h1>Quase lá.</h1>
          <FormCard
            number="1"
            title="Contato"
            subtitle="Usaremos os dados da sua conta"
          >
            <div className="form-grid">
              <label>
                Telefone
                <input name="phone" placeholder="(00) 00000-0000" required />
              </label>
            </div>
          </FormCard>
          <FormCard
            number="2"
            title="Entrega"
            subtitle="Informe o endereço de destino"
          >
            {addresses.length>0&&<label className="saved-address-select">Usar endereço salvo<select value={selectedAddress} onChange={e=>chooseAddress(e.target.value)}><option value="">Preencher outro endereço</option>{addresses.map(address=><option value={address.id} key={address.id}>{address.label} — {address.street}, {address.number}</option>)}</select></label>}
            <div className="form-grid">
              <label>
                CEP
                <span className="checkout-cep"><input name="postalCode" placeholder="00000-000" required value={delivery.postalCode} onChange={e=>lookupCheckoutCep(e.target.value)}/>{cepLoading&&<span>Buscando…</span>}</span>
              </label>
              <label>
                Estado
                <select name="state" required value={delivery.state} onChange={e=>setDelivery({...delivery,state:e.target.value})}>
                  <option value="">Selecione</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(state=><option key={state}>{state}</option>)}
                </select>
              </label>
              <label className="full">
                Endereço
                <input name="address" placeholder="Rua, avenida..." required value={delivery.street} onChange={e=>setDelivery({...delivery,street:e.target.value})}/>
              </label>
              <label>
                Número
                <input name="number" placeholder="123" required value={delivery.number} onChange={e=>setDelivery({...delivery,number:e.target.value})}/>
              </label>
              <label>
                Complemento
                <input name="complement" placeholder="Opcional" value={delivery.complement} onChange={e=>setDelivery({...delivery,complement:e.target.value})}/>
              </label>
              <label><span>Bairro</span><input name="neighborhood" value={delivery.neighborhood} onChange={e=>setDelivery({...delivery,neighborhood:e.target.value})}/></label>
              <label><span>Cidade</span><input name="city" required value={delivery.city} onChange={e=>setDelivery({...delivery,city:e.target.value})}/></label>
            </div>
            {vehicles.length>0&&<label className="checkout-vehicle">Veículo deste pedido (opcional)<select value={selectedVehicle} onChange={e=>setSelectedVehicle(e.target.value)}><option value="">Não selecionar</option>{vehicles.map(vehicle=><option value={vehicle.plate} key={vehicle.id}>{vehicle.nickname||`${vehicle.brand} ${vehicle.model}`} — {vehicle.plate}</option>)}</select></label>}
          </FormCard>
          <FormCard
            number="3"
            title="Pagamento"
            subtitle="Será ativado após configurar o provedor"
          >
            <div className="payment-tabs">
              <button type="button" className="active">
                Pix
              </button>
              <button type="button">Cartão</button>
              <button type="button">Boleto</button>
            </div>
            <p style={{ fontSize: 10, color: "#777" }}>
              Nenhum dado de cartão é solicitado enquanto a integração de
              pagamento não estiver configurada.
            </p>
          </FormCard>
          {error && <p className="checkout-error">{error}</p>}
          <button className="finish" disabled={!items.length || saving}>
            {saving
              ? "Salvando pedido..."
              : `Criar pedido • ${money(subtotal)}`}{" "}
            <ChevronRight />
          </button>
        </form>
        <aside className="order">
          <small>RESUMO DO PEDIDO</small>
          {items.map((p, i) => (
            <div className="order-item" key={i}>
              <PartVisual product={p} />
              <span>
                <b>{p.name}</b>
                <small>Qtd. 1</small>
              </span>
              <strong>{money(p.price ?? 0)}</strong>
            </div>
          ))}
          <div className="totals">
            <p>
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </p>
            <p>
              <span>Frete</span>
              <b>{subtotal >= 499 ? "Grátis" : "A calcular"}</b>
            </p>
            <p>
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </p>
          </div>
          <div className="secure">
            <ShieldCheck />
            <span>
              <b>Pedido protegido</b>
              <small>Seus dados ficam vinculados à sua conta</small>
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
function FormCard({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-card">
      <div className="step">
        <b>{number}</b>
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
      </div>
      {children}
    </div>
  );
}
