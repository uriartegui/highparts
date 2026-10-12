"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MailWarning,
  MapPin,
  Menu,
  Package,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  X,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  emailVerifiedAt: string | null;
};
type Order = {
  id: string;
  totalCents: number;
  status: string;
  paymentProvider: string;
  vehiclePlate: string;
  shippingAddress: string;
  shippingCarrier: string;
  shippingService: string;
  trackingCode: string;
  shippedAt: string | null;
  createdAt: string;
  itemCount: number;
  items: Array<{
    itemKey: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
  }>;
};
type Address = {
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
};
const money = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento aprovado",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export default function AccountDashboard({ user }: { user: User }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">(
    "success",
  );
  const [sending, setSending] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [activeSection, setActiveSection] = useState("addresses");
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    postalCode: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const load = async () => {
    const [o, a] = await Promise.all([
      fetch("/api/account/orders").then((r) => r.json()),
      fetch("/api/account/addresses").then((r) => r.json()),
    ]);
    setOrders(o.orders ?? []);
    setAddresses(a.addresses ?? []);
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  useEffect(() => {
    const root = document.querySelector(".account>section");
    const sections = ["addresses", "orders"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { root, rootMargin: "-18% 0px -52%", threshold: [0, 0.15, 0.35, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  async function resend() {
    setSending(true);
    const r = await fetch("/api/auth/resend-verification", { method: "POST" });
    const d = await r.json();
    setMessageKind(r.ok ? "success" : "error");
    setMessage(
      r.ok
        ? "E-mail de confirmação enviado. Verifique também a caixa de spam."
        : d.error,
    );
    setSending(false);
  }
  async function lookupCep(value: string) {
    const cep = value.replace(/\D/g, "").slice(0, 8);
    setAddressDraft((d) => ({ ...d, postalCode: cep }));
    if (cep.length !== 8) return;
    setLookingUpCep(true);
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
      setAddressDraft({
        postalCode: cep,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      });
    } catch {
      setMessageKind("error");
      setMessage("CEP não encontrado. Preencha o endereço manualmente.");
    } finally {
      setLookingUpCep(false);
    }
  }
  async function addAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSavingAddress(true);
    setMessage("");
    let response: Response;
    let data: { error?: string } = {};
    try {
      const body = {
        ...Object.fromEntries(new FormData(form)),
        ...addressDraft,
      };
      response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      data = await response.json().catch(() => ({}));
    } catch {
      setMessageKind("error");
      setMessage("Falha de conexão. Tente novamente.");
      setSavingAddress(false);
      return;
    }
    if (!response.ok) {
      setMessageKind("error");
      setMessage(data.error || "Não foi possível salvar o endereço.");
      setSavingAddress(false);
      return;
    }
    setMessageKind("success");
    setMessage("Endereço salvo.");
    form.reset();
    setAddressDraft({
      postalCode: "",
      street: "",
      neighborhood: "",
      city: "",
      state: "",
    });
    setShowAddress(false);
    setSavingAddress(false);
    void load();
  }
  async function removeAddress(id: string) {
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    load();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  }
  return (
    <main className="account">
      <div className="account-mobile-header">
        <button
          className="account-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Fechar menu da conta" : "Abrir menu da conta"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <a href="/" aria-label="HighParts — página inicial">
          <img src="/highparts-logo.png" alt="HighParts" />
        </a>
      </div>
      <button
        className={`account-menu-backdrop ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-label="Fechar menu da conta"
      />
      <aside className={menuOpen ? "mobile-open" : ""}>
        <a
          className="account-logo"
          href="/"
          aria-label="Voltar à loja HighParts"
        >
          <img src="/highparts-logo.png" alt="HighParts" />
        </a>
        <nav>
          <span className="account-nav-label">CONTA</span>
          <a
            className={activeSection === "addresses" ? "active" : ""}
            href="#addresses"
            onClick={() => {
              setActiveSection("addresses");
              setMenuOpen(false);
            }}
          >
            <MapPin /> Endereços
          </a>
          <a
            className={activeSection === "orders" ? "active" : ""}
            href="#orders"
            onClick={() => {
              setActiveSection("orders");
              setMenuOpen(false);
            }}
          >
            <Package /> Pedidos
          </a>
          <a href="/">
            <Store /> Voltar à loja
          </a>
          {user.role === "admin" && (
            <>
              <span className="account-nav-label admin-label">
                ADMINISTRAÇÃO
              </span>
              <a href="/admin">
                <LayoutDashboard /> Painel administrativo
              </a>
              <a href="/admin/seguranca">
                <ShieldCheck /> Segurança e acessos
              </a>
            </>
          )}
        </nav>
        <div className="account-sidebar-user">
          <i>{user.name.trim().charAt(0).toUpperCase()}</i>
          <span>
            <b>{user.name}</b>
            <small>{user.email}</small>
          </span>
        </div>
        <button onClick={logout}>
          <LogOut /> Sair
        </button>
      </aside>
      <section>
        <header>
          <small>MINHA CONTA</small>
          <h1>Olá, {user.name.split(" ")[0]}.</h1>
          <p>{user.email}</p>
        </header>
        {!user.emailVerifiedAt && (
          <div className="verification-alert">
            <MailWarning />
            <span>
              <b>Confirme seu e-mail</b>
              <small>
                A confirmação será exigida antes de finalizar uma compra.
              </small>
            </span>
            <button onClick={resend} disabled={sending}>
              {sending ? "Enviando..." : "Reenviar confirmação"}
            </button>
          </div>
        )}
        {message && (
          <div className={`account-message ${messageKind}`} role="status">
            <i className="account-message-icon">
              {messageKind === "success" ? <CheckCircle2 /> : <AlertCircle />}
            </i>
            <span>
              <b>
                {messageKind === "success"
                  ? "Tudo certo"
                  : "Não foi possível continuar"}
              </b>
              <small>{message}</small>
            </span>
            <button onClick={() => setMessage("")} aria-label="Fechar mensagem">
              ×
            </button>
          </div>
        )}
        <div className="account-overview">
          <span>
            <MapPin />
            <b>{addresses.length}</b>
            <small>
              {addresses.length === 1 ? "endereço salvo" : "endereços salvos"}
            </small>
          </span>
          <span>
            <Package />
            <b>{orders.length}</b>
            <small>
              {orders.length === 1 ? "pedido realizado" : "pedidos realizados"}
            </small>
          </span>
        </div>
        <article id="addresses" className="account-card">
          <div className="account-card-head">
            <span>
              <small>ENTREGA</small>
              <h2>Meus endereços</h2>
            </span>
            <button onClick={() => setShowAddress(!showAddress)}>
              <Plus /> {showAddress ? "Fechar cadastro" : "Adicionar endereço"}
            </button>
          </div>
          {showAddress && (
            <form
              className="address-form account-entry-form"
              onSubmit={addAddress}
            >
              <div className="account-form-intro">
                <MapPin />
                <span>
                  <b>Endereço de entrega</b>
                  <small>
                    Digite o CEP para preencher automaticamente rua, bairro,
                    cidade e estado.
                  </small>
                </span>
              </div>
              <label>
                Identificação
                <input
                  name="label"
                  placeholder="Casa, trabalho..."
                  defaultValue="Casa"
                />
              </label>
              <label>
                CEP
                <span className="cep-field">
                  <input
                    name="postalCode"
                    inputMode="numeric"
                    required
                    placeholder="00000-000"
                    value={addressDraft.postalCode.replace(
                      /^(\d{5})(\d{0,3})/,
                      "$1-$2",
                    )}
                    onChange={(e) => lookupCep(e.target.value)}
                  />
                  {lookingUpCep && <LoaderCircle className="spin" />}
                </span>
              </label>
              <label className="wide">
                Rua
                <input
                  name="street"
                  required
                  placeholder="Rua, avenida..."
                  value={addressDraft.street}
                  onChange={(e) =>
                    setAddressDraft({ ...addressDraft, street: e.target.value })
                  }
                />
              </label>
              <label>
                Número
                <input name="number" required placeholder="123 ou S/N" />
              </label>
              <label>
                Complemento <em>opcional</em>
                <input name="complement" placeholder="Apto., bloco..." />
              </label>
              <label>
                Bairro
                <input
                  name="neighborhood"
                  placeholder="Bairro"
                  value={addressDraft.neighborhood}
                  onChange={(e) =>
                    setAddressDraft({
                      ...addressDraft,
                      neighborhood: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Cidade
                <input
                  name="city"
                  required
                  placeholder="Cidade"
                  value={addressDraft.city}
                  onChange={(e) =>
                    setAddressDraft({ ...addressDraft, city: e.target.value })
                  }
                />
              </label>
              <label>
                Estado
                <select
                  name="state"
                  required
                  value={addressDraft.state}
                  onChange={(e) =>
                    setAddressDraft({ ...addressDraft, state: e.target.value })
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
                  ].map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
              <label className="default-address">
                <input type="checkbox" name="isDefault" value="true" />{" "}
                <span>
                  <b>Usar como endereço principal</b>
                  <small>Será selecionado automaticamente no checkout.</small>
                </span>
              </label>
              <div className="account-form-actions">
                <button type="button" onClick={() => setShowAddress(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingAddress || lookingUpCep}>
                  {savingAddress ? (
                    <>
                      <LoaderCircle className="spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar endereço"
                  )}
                </button>
              </div>
            </form>
          )}
          <div className="address-list">
            {addresses.length ? (
              addresses.map((a) => (
                <div key={a.id}>
                  <MapPin />
                  <span>
                    <b>
                      {a.label}
                      {a.isDefault ? " • Principal" : ""}
                    </b>
                    <small>
                      {a.street}, {a.number}
                      {a.complement && ` • ${a.complement}`}
                      <br />
                      {a.neighborhood && `${a.neighborhood} • `}
                      {a.city}/{a.state} •{" "}
                      {a.postalCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
                    </small>
                  </span>
                  <button
                    onClick={() => removeAddress(a.id)}
                    aria-label={`Remover endereço ${a.label}`}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))
            ) : (
              <div className="account-empty-state">
                <MapPin />
                <b>Nenhum endereço salvo</b>
                <p>Adicione um endereço para agilizar o checkout.</p>
              </div>
            )}
          </div>
        </article>
        <article id="orders" className="account-card">
          <div className="account-card-head">
            <span>
              <small>HISTÓRICO</small>
              <h2>Minhas compras</h2>
            </span>
          </div>
          {orders.length ? (
            <div className="order-history">
              {orders.map((o) => {
                const progress =
                  {
                    awaiting_payment: 0,
                    paid: 1,
                    processing: 2,
                    shipped: 3,
                    delivered: 3,
                  }[o.status] ?? 0;
                return (
                  <section className="order-card" key={o.id}>
                    <header>
                      <span>
                        <small>PEDIDO</small>
                        <b>#{o.id}</b>
                      </span>
                      <span className="order-date">
                        <small>REALIZADO EM</small>
                        <b>
                          {new Date(
                            o.createdAt.replace(" ", "T") + "Z",
                          ).toLocaleDateString("pt-BR")}
                        </b>
                      </span>
                      <strong>{money(o.totalCents)}</strong>
                      <em className={`status-${o.status}`}>
                        {statusLabel[o.status] || o.status}
                      </em>
                    </header>
                    <div className="order-progress">
                      {[
                        "Pedido recebido",
                        "Pagamento",
                        "Separação",
                        "Envio",
                      ].map((step, index) => (
                        <span
                          key={step}
                          className={index <= progress ? "active" : ""}
                        >
                          <i>{index + 1}</i>
                          <b>{step}</b>
                        </span>
                      ))}
                    </div>
                    <div className="order-details">
                      <div className="order-products">
                        <small>ITENS DO PEDIDO</small>
                        {(o.items || []).map((item) => (
                          <div key={item.itemKey}>
                            <span>
                              <b>{item.name}</b>
                              <small>
                                {item.itemKey} • Quantidade {item.quantity}
                              </small>
                            </span>
                            <strong>
                              {money(item.unitPriceCents * item.quantity)}
                            </strong>
                          </div>
                        ))}
                      </div>
                      <aside>
                        <small>ENTREGA</small>
                        <p>{o.shippingAddress || "Endereço não informado"}</p>
                        {o.trackingCode ? (
                          <>
                            <small>RASTREAMENTO</small>
                            <p>
                              <b>{o.trackingCode}</b>
                              <br />
                              {[o.shippingCarrier, o.shippingService]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          </>
                        ) : null}
                        <small>PAGAMENTO</small>
                        <p>
                          {o.paymentProvider === "pending_provider"
                            ? "Integração de pagamento pendente"
                            : o.paymentProvider}
                        </p>
                      </aside>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="account-empty-state">
              <Package />
              <b>Nenhum pedido ainda</b>
              <p>
                Quando você finalizar uma compra, o acompanhamento aparecerá
                aqui.
              </p>
              <a href="/catalogo">Explorar catálogo</a>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
