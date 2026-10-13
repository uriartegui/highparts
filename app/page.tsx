"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Car,
  Check,
  ChevronRight,
  ListFilter,
  MessageCircle,
  PackageCheck,
  Search,
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
import StoreFooter from "./store-footer";
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
type CheckoutUser = {
  name: string;
  email: string;
  phone: string;
  emailVerifiedAt: string | null;
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

function featuredCompatibility(fit: string) {
  const labels: Record<string, string> = {
    VW: "Volkswagen",
    GM: "Chevrolet",
  };
  const brands = [
    ...new Set(
      [...fit.matchAll(/\[([^\]]+)\]/g)].map((match) => {
        const brand = match[1].trim().toUpperCase();
        return labels[brand] || match[1].trim();
      }),
    ),
  ];
  if (!brands.length) return "Consulte os modelos e anos compatíveis.";
  const visible = brands.slice(0, 3);
  const list =
    visible.length > 1
      ? `${visible.slice(0, -1).join(", ")} e ${visible.at(-1)}`
      : visible[0];
  return `Aplicações para ${list}${brands.length > 3 ? " e outras marcas" : ""}. Consulte modelos e anos.`;
}

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
  const [user, setUser] = useState<CheckoutUser | null>(null);
  const [cartReady, setCartReady] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [heroSuggestions, setHeroSuggestions] = useState<ApiProduct[]>([]);
  const [heroSearchActive, setHeroSearchActive] = useState(false);
  useEffect(() => {
    (async () => {
      const catalog = await fetch("/api/catalog?limit=60")
        .then((r) => r.json() as Promise<{ products?: ApiProduct[] }>)
        .catch(() => ({ products: [] }));
      const mapped = (catalog.products || []).map(mapProduct);
      if (mapped.length) setProducts(mapped);
      const local = JSON.parse(
        localStorage.getItem("highparts_cart") || "[]",
      ) as string[];
      const me = await fetch("/api/auth/me")
        .then((r) => r.json() as Promise<{ user: CheckoutUser | null }>)
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
        const remote = (saved.items || []).flatMap((item) =>
          Array.from({ length: item.quantity }, () => String(item.itemKey)),
        );
        const selected = remote.length ? remote : local;
        await loadCartProducts(selected, mapped);
        setCart(selected);
      } else {
        await loadCartProducts(local, mapped);
        setCart(local);
      }
      setCartReady(true);
      if (new URLSearchParams(window.location.search).get("checkout") === "1") {
        if (me.user) setCheckout(true);
        else location.replace("/entrar?returnTo=/?checkout=1");
      }

      async function loadCartProducts(ids: string[], current: Product[]) {
        const missing = [...new Set(ids)].filter(
          (id) => !current.some((product) => product.id === id),
        );
        if (!missing.length) return;
        const params = new URLSearchParams({
          codes: missing.join(","),
          limit: String(Math.min(100, missing.length)),
        });
        const extra = await fetch(`/api/catalog?${params}`)
          .then((r) => r.json() as Promise<{ products?: ApiProduct[] }>)
          .catch(() => ({ products: [] }));
        const combined = [
          ...current,
          ...(extra.products || []).map(mapProduct),
        ];
        setProducts(
          combined.filter(
            (product, index, all) =>
              all.findIndex((candidate) => candidate.id === product.id) ===
              index,
          ),
        );
      }
    })();
  }, []);
  useEffect(() => {
    const query = heroQuery.trim();
    if (query.length < 2) {
      setHeroSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query, limit: "5" });
      fetch(`/api/catalog?${params}`, { signal: controller.signal })
        .then(
          (response) => response.json() as Promise<{ products?: ApiProduct[] }>,
        )
        .then((data) => setHeroSuggestions(data.products || []))
        .catch(() => {});
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [heroQuery]);
  useEffect(() => {
    if (!cartReady) return;
    localStorage.setItem("highparts_cart", JSON.stringify(cart));
    if (user) {
      const grouped = [...new Set(cart)].flatMap((id) => {
        const p = products.find((product) => product.id === id);
        if (!p) return [];
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
  function addToCart(id: string) {
    if (!user) {
      location.href = `/entrar?returnTo=${encodeURIComponent(location.pathname)}`;
      return;
    }
    setCart((current) => [...current, id]);
    setCartOpen(true);
  }
  if (checkout)
    return (
      <Checkout
        items={items}
        subtotal={subtotal}
        user={user!}
        onBack={() => setCheckout(false)}
      />
    );
  return (
    <main
      className={
        heroSearchActive && heroSuggestions.length ? "search-suggesting" : ""
      }
    >
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
          <form
            className="hero-search"
            action="/catalogo"
            method="get"
            onFocus={() => setHeroSearchActive(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setHeroSearchActive(false);
            }}
          >
            <Search aria-hidden="true" />
            <input
              type="search"
              name="q"
              aria-label="Buscar peça no catálogo"
              placeholder="Digite a peça, o código ou o carro"
              value={heroQuery}
              onChange={(event) => setHeroQuery(event.target.value)}
              aria-expanded={heroSuggestions.length > 0}
              autoComplete="off"
            />
            <button type="submit">
              Buscar peça <ChevronRight />
            </button>
            {heroSearchActive && heroSuggestions.length > 0 && (
              <div className="hero-suggestions">
                <small>SUGESTÕES DO CATÁLOGO</small>
                {heroSuggestions.map((product) => (
                  <a
                    href={`/produto/${encodeURIComponent(product.code)}`}
                    key={product.code}
                  >
                    <span>
                      <b>{product.product}</b>
                      <small>{product.application}</small>
                    </span>
                    <strong>{product.code}</strong>
                  </a>
                ))}
                <a
                  className="hero-suggestions-all"
                  href={`/catalogo?q=${encodeURIComponent(heroQuery)}`}
                >
                  Ver todos os resultados <ChevronRight />
                </a>
              </div>
            )}
          </form>
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
              <article
                className="product featured-product"
                key={p.id}
                role="link"
                tabIndex={0}
                aria-label={`Ver detalhes de ${p.name} ${p.id}`}
                onClick={() => {
                  window.location.href = `/produto/${encodeURIComponent(p.id)}`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    window.location.href = `/produto/${encodeURIComponent(p.id)}`;
                  }
                }}
              >
                <span className="badge">Disponível</span>
                <PartVisual product={p} />
                <div className="product-body">
                  <small>CÓDIGO HIGHPARTS · {p.id}</small>
                  <h3>{p.name}</h3>
                  <p className="featured-fit">{featuredCompatibility(p.fit)}</p>
                  <span className="featured-more">
                    Ver aplicações completas <ChevronRight />
                  </span>
                  <div className="price">
                    <b>{money(p.price!)}</b>
                    <span>
                      {p.stock === 1
                        ? "Última unidade em estoque"
                        : `${p.stock} unidades em estoque`}
                    </span>
                  </div>
                  <button
                    className="buy"
                    onClick={(event) => {
                      event.stopPropagation();
                      addToCart(p.id);
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
      <StoreFooter />
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
                  if (!user) {
                    location.href = "/entrar?returnTo=/?checkout=1";
                    return;
                  }
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
  user,
  onBack,
}: {
  items: Product[];
  subtotal: number;
  user: CheckoutUser;
  onBack: () => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [paymentRetrying, setPaymentRetrying] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const [phone, setPhone] = useState(() => formatPhone(user.phone || ""));
  const [addresses, setAddresses] = useState<
    Array<{
      id: string;
      label: string;
      postalCode: string;
      street: string;
      number: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
      isDefault: number;
    }>
  >([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [delivery, setDelivery] = useState({
    postalCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  useEffect(() => {
    fetch("/api/account/addresses")
      .then((r) => (r.ok ? r.json() : { addresses: [] }))
      .then((a) => {
        const list = a.addresses ?? [];
        setAddresses(list);
        const preferred =
          list.find((item: { isDefault: number }) => item.isDefault) || list[0];
        if (preferred) {
          setSelectedAddress(preferred.id);
          setDelivery(preferred);
        }
      });
  }, []);
  function chooseAddress(id: string) {
    setSelectedAddress(id);
    const address = addresses.find((item) => item.id === id);
    if (address) setDelivery(address);
  }
  async function lookupCheckoutCep(value: string) {
    const cep = value.replace(/\D/g, "").slice(0, 8);
    setSelectedAddress("");
    setDelivery((current) => ({ ...current, postalCode: cep }));
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const data = (await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(
        (r) => r.json(),
      )) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) throw new Error();
      setDelivery((current) => ({
        ...current,
        postalCode: cep,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch {
      setError(
        "CEP não encontrado. Confira o número ou preencha o endereço manualmente.",
      );
    } finally {
      setCepLoading(false);
    }
  }
  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const grouped = [...new Set(items.map((p) => p.id))].map((id) => ({
      itemKey: id,
      quantity: items.filter((x) => x.id === id).length,
    }));
    if (!selectedAddress) {
      const savedAddress = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: "Casa",
          ...delivery,
          isDefault: addresses.length === 0,
        }),
      });
      if (!savedAddress.ok) {
        const detail = await savedAddress.json().catch(() => ({}));
        setError(
          detail.error ?? "Não foi possível salvar o endereço na sua conta.",
        );
        setSaving(false);
        return;
      }
    }
    const response = await fetch("/api/account/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: fields.phone,
        postalCode: delivery.postalCode,
        address: `${delivery.street}, ${delivery.number}${delivery.complement ? `, ${delivery.complement}` : ""} - ${delivery.neighborhood ? `${delivery.neighborhood}, ` : ""}${delivery.city}/${delivery.state}`,
        vehiclePlate: "",
        items: grouped,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      order?: { id: string };
      payment?: { checkoutUrl?: string; message?: string };
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
    if (result.payment?.checkoutUrl) {
      location.href = result.payment.checkoutUrl;
      return;
    }
    setOrderId(result.order.id);
  }
  async function retryPayment() {
    setPaymentRetrying(true);
    setError("");
    const response = await fetch(
      "/api/account/orders/" + encodeURIComponent(orderId) + "/payment",
      { method: "POST" },
    );
    const result = (await response.json().catch(() => ({}))) as {
      checkoutUrl?: string;
      error?: string;
    };
    if (response.ok && result.checkoutUrl) location.href = result.checkoutUrl;
    else {
      setError(result.error || "Não foi possível abrir o pagamento agora.");
      setPaymentRetrying(false);
    }
  }
  if (orderId)
    return (
      <main className="checkout">
        <div className="success">
          <i>
            <Check />
          </i>
          <small>PEDIDO RESERVADO</small>
          <h1>Pedido salvo.</h1>
          <p>
            Pedido <b>#{orderId}</b> criado. Abra o Mercado Pago para concluir a
            compra com segurança.
          </p>
          {error && <p className="checkout-error">{error}</p>}
          <button onClick={retryPayment} disabled={paymentRetrying}>
            {paymentRetrying ? "Abrindo pagamento..." : "Pagar com Mercado Pago"}
          </button>
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
            <div className="checkout-account-summary">
              <span>
                <small>Comprando como</small>
                <b>{user.name}</b>
              </span>
              <span>
                <small>E-mail</small>
                <b>{user.email}</b>
              </span>
            </div>
            <div className="form-grid">
              <label>
                Telefone
                <input
                  name="phone"
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  required
                  value={phone}
                  onChange={(event) =>
                    setPhone(formatPhone(event.target.value))
                  }
                />
              </label>
            </div>
          </FormCard>
          <FormCard
            number="2"
            title="Entrega"
            subtitle="Informe o endereço de destino"
          >
            {addresses.length > 0 && (
              <label className="saved-address-select">
                Usar endereço salvo
                <select
                  value={selectedAddress}
                  onChange={(e) => chooseAddress(e.target.value)}
                >
                  <option value="">Preencher outro endereço</option>
                  {addresses.map((address) => (
                    <option value={address.id} key={address.id}>
                      {address.label} — {address.street}, {address.number}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="form-grid">
              <label>
                CEP
                <span className="checkout-cep">
                  <input
                    name="postalCode"
                    placeholder="00000-000"
                    required
                    value={delivery.postalCode}
                    onChange={(e) => lookupCheckoutCep(e.target.value)}
                  />
                  {cepLoading && <span>Buscando…</span>}
                </span>
              </label>
              <label>
                Estado
                <select
                  name="state"
                  required
                  value={delivery.state}
                  onChange={(e) =>
                    setDelivery({ ...delivery, state: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {[
                    "AC",
                    "AL",
                    "AP",
                    "AM",
                    "BA",
                    "CE",
                    "DF",
                    "ES",
                    "GO",
                    "MA",
                    "MT",
                    "MS",
                    "MG",
                    "PA",
                    "PB",
                    "PR",
                    "PE",
                    "PI",
                    "RJ",
                    "RN",
                    "RS",
                    "RO",
                    "RR",
                    "SC",
                    "SP",
                    "SE",
                    "TO",
                  ].map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </select>
              </label>
              <label className="full">
                Endereço
                <input
                  name="address"
                  placeholder="Rua, avenida..."
                  required
                  value={delivery.street}
                  onChange={(e) =>
                    setDelivery({ ...delivery, street: e.target.value })
                  }
                />
              </label>
              <label>
                Número
                <input
                  name="number"
                  placeholder="123"
                  required
                  value={delivery.number}
                  onChange={(e) =>
                    setDelivery({ ...delivery, number: e.target.value })
                  }
                />
              </label>
              <label>
                Complemento
                <input
                  name="complement"
                  placeholder="Opcional"
                  value={delivery.complement}
                  onChange={(e) =>
                    setDelivery({ ...delivery, complement: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Bairro</span>
                <input
                  name="neighborhood"
                  value={delivery.neighborhood}
                  onChange={(e) =>
                    setDelivery({ ...delivery, neighborhood: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Cidade</span>
                <input
                  name="city"
                  required
                  value={delivery.city}
                  onChange={(e) =>
                    setDelivery({ ...delivery, city: e.target.value })
                  }
                />
              </label>
            </div>
          </FormCard>
          <FormCard
            number="3"
            title="Pagamento"
            subtitle="Você será direcionado ao ambiente seguro do Mercado Pago"
          >
            <div className="payment-tabs">
              <button type="button" className="active">
                Pix
              </button>
              <button type="button">Cartão</button>
              <button type="button">Boleto</button>
            </div>
            <p style={{ fontSize: 10, color: "#777" }}>
              Pix, cartão e boleto são processados pelo Mercado Pago. A HighParts
              não recebe nem armazena os dados do seu cartão.
            </p>
          </FormCard>
          {!user.emailVerifiedAt && (
            <div className="checkout-verification" role="alert">
              <ShieldCheck />
              <span>
                <b>Confirme seu e-mail para criar o pedido</b>
                <small>
                  Acesse sua conta para reenviar a confirmação. Seu carrinho e
                  endereço permanecerão salvos.
                </small>
              </span>
              <a href="/conta">Confirmar e-mail</a>
            </div>
          )}
          {error && <p className="checkout-error">{error}</p>}
          <button
            className="finish"
            disabled={!items.length || saving || !user.emailVerifiedAt}
          >
            {saving
              ? "Salvando pedido..."
              : `Ir para o pagamento • ${money(subtotal)}`}{" "}
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
