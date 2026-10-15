"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  Check,
  ChevronLeft,
  Database,
  Download,
  ClipboardCheck,
  LoaderCircle,
  MapPin,
  PackageSearch,
  PlugZap,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  TrendingUp,
  Upload,
} from "lucide-react";

type Product = {
  code: string;
  originalCode: string;
  product: string;
  application: string;
  axle: string;
  type: string;
  priceCents: number | null;
  stockQuantity: number | null;
  imageUrl: string | null;
  active: boolean;
  blingDraft: boolean;
  blingName: string | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  shippingDataSource: "bling" | "manual" | null;
};
type Summary = {
  products: number;
  priced: number;
  stockDefined: number;
  orders: number;
  drafts: number;
};
type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalCents: number;
  status: string;
  paymentProvider: string;
  paymentMode: string | null;
  createdAt: string;
  itemCount: number;
  shippingAddress: string;
  shippingCarrier: string;
  shippingService: string;
  trackingCode: string;
  shippedAt: string | null;
  items: Array<{
    itemKey: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    packed: number;
  }>;
};
type Tab = "inventory" | "orders" | "finance" | "integrations";
type BlingStatus = {
  configured: boolean;
  connected: boolean;
  enabled: boolean;
  credentialUpdatedAt: string | null;
  products: { total: number; linked: number; official: number; drafts: number };
};
type InventoryFilter = "all" | "bling-draft" | "missing-price" | "missing-stock" | "missing-shipping" | "ready";
async function prepareProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem válida.");
  if (file.size > 12 * 1024 * 1024) throw new Error("A imagem original deve ter no máximo 12 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .8));
  if (!blob || blob.size > 1024 * 1024) throw new Error("Não foi possível compactar a imagem para menos de 1 MB.");
  return new File([blob], "produto.webp", { type: "image/webp" });
}
const statusLabels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  payment_failed: "Pagamento falhou",
  refunded: "Reembolsado",
};
const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export default function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>("inventory");
  const [summary, setSummary] = useState<Summary>({
    products: 0,
    priced: 0,
    stockDefined: 0,
    orders: 0,
    drafts: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [bling, setBling] = useState<BlingStatus | null>(null);
  const orderMetrics = {
    awaiting: orders.filter((order) => order.status === "awaiting_payment")
      .length,
    packing: orders.filter((order) =>
      ["paid", "processing"].includes(order.status),
    ).length,
    shipped: orders.filter((order) => order.status === "shipped").length,
    completed: orders.filter((order) => order.status === "delivered").length,
  };
  const loadProducts = async (
    q = "",
    status: InventoryFilter = inventoryFilter,
  ) => {
    setLoading(true);
    const r = await fetch(
      `/api/admin/catalog?q=${encodeURIComponent(q)}&status=${status}`,
    );
    if (r.ok) {
      const d = (await r.json()) as { products: Product[]; summary: Summary };
      setProducts(d.products);
      setSummary(d.summary);
    }
    setLoading(false);
  };
  const loadOrders = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/orders");
    if (r.ok) {
      const d = (await r.json()) as { orders: Order[] };
      setOrders(d.orders);
    }
    setLoading(false);
  };
  const loadBling = async () => {
    setLoading(true);
    const response = await fetch("/api/admin/bling/status");
    if (response.ok) setBling(await response.json() as BlingStatus);
    setLoading(false);
  };
  useEffect(() => {
    loadProducts();
  }, []);
  const changeTab = (next: Tab) => {
    setTab(next);
    setMessage("");
    if (next === "orders" || next === "finance") loadOrders();
    else if (next === "integrations") loadBling();
    else loadProducts(query);
  };
  const syncBling = async () => {
    if (!window.confirm(
      "Sincronizar agora? Produtos com SKU conhecido serão atualizados e produtos novos entrarão como rascunho para revisão.",
    )) return;
    setSyncing(true);
    setMessage("");
    const response = await fetch("/api/admin/bling/sync", { method: "POST" });
    const result = await response.json().catch(() => ({})) as { seen?: number; linked?: number; drafts?: number; error?: string };
    setMessage(response.ok
      ? `${result.linked || 0} de ${result.seen || 0} produtos do Bling processados. ${result.drafts || 0} aguardando revisão.`
      : result.error || "Falha ao sincronizar o Bling.");
    setSyncing(false);
    if (response.ok) {
      await loadBling();
      setInventoryFilter("bling-draft");
    }
  };
  const save = async (p: Product) => {
    const r = await fetch(`/api/admin/catalog/${encodeURIComponent(p.code)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        priceCents: p.priceCents,
        stockQuantity: p.stockQuantity,
        imageUrl: p.imageUrl,
        active: p.active,
        product: p.product,
        application: p.application,
        axle: p.axle,
        originalCode: p.originalCode,
        weightGrams: p.weightGrams,
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
      }),
    });
    const result = (await r.json().catch(() => ({}))) as { error?: string };
    setMessage(
      r.ok
        ? `${p.code} atualizado.`
        : result.error || "Não foi possível salvar.",
    );
    if (r.ok) loadProducts(query);
  };
  const updateOrder = async (
    order: Order,
    changes: {
      status: string;
      shippingCarrier: string;
      shippingService: string;
      trackingCode: string;
      packedItems: string[];
    },
  ) => {
    const r = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    });
    const result = (await r.json().catch(() => ({}))) as {
      error?: string;
      emailSent?: boolean;
    };
    setMessage(
      r.ok
        ? `Pedido ${order.id} atualizado${result.emailSent ? " e cliente avisado por e-mail" : ""}.`
        : result.error || "Não foi possível atualizar o pedido.",
    );
    if (r.ok) await loadOrders();
    return r.ok;
  };
  return (
    <main className="real-admin">
      <aside>
        <img src="/highparts-logo.png" alt="HighParts" />
        <small>ADMINISTRAÇÃO</small>
        <nav>
          <button
            className={tab === "inventory" ? "active" : ""}
            onClick={() => changeTab("inventory")}
          >
            <Boxes /> Estoque
          </button>
          <button
            className={tab === "orders" ? "active" : ""}
            onClick={() => changeTab("orders")}
          >
            <ShoppingBag /> Pedidos{" "}
            {summary.orders > 0 && <b>{summary.orders}</b>}
          </button>
          <button
            className={tab === "finance" ? "active" : ""}
            onClick={() => changeTab("finance")}
          >
            <BarChart3 /> Financeiro
          </button>
          <button
            className={tab === "integrations" ? "active" : ""}
            onClick={() => changeTab("integrations")}
          >
            <PlugZap /> Integrações
          </button>
        </nav>
        <div className="admin-user">
          <ShieldCheck />
          <span>
            <b>Administrador</b>
            <small>{adminEmail}</small>
          </span>
        </div>
        <a href="/">
          <ChevronLeft /> Voltar para a loja
        </a>
      </aside>
      <section>
        <header>
          <div>
            <small>
              {tab === "inventory"
                ? "CATÁLOGO HIGHPARTS"
                : tab === "orders"
                  ? "VENDAS HIGHPARTS"
                  : tab === "finance"
                    ? "DESEMPENHO HIGHPARTS"
                    : "OPERAÇÃO HIGHPARTS"}
            </small>
            <h1>
              {tab === "inventory"
                ? "Produtos e estoque"
                : tab === "orders"
                  ? "Pedidos recebidos"
                  : tab === "finance"
                    ? "Visão financeira"
                    : "Integrações"}
            </h1>
            <p>
              {tab === "inventory"
                ? "Revise produtos novos do Bling e publique somente depois de completar os dados técnicos."
                : tab === "orders"
                  ? "Consulte clientes, valores e atualize o andamento de cada venda."
                  : tab === "finance"
                    ? "Acompanhe vendas confirmadas, ticket médio e produtos com maior saída."
                    : "Conecte o ERP e acompanhe a fonte oficial de estoque."}
            </p>
          </div>
          {tab === "integrations" && bling?.connected && (
            <button onClick={syncBling} disabled={syncing}>
              {syncing ? <LoaderCircle className="spin" /> : <RefreshCw />}
              {syncing ? "Sincronizando..." : "Sincronizar Bling"}
            </button>
          )}
        </header>
        {message && (
          <div className="admin-message">
            <Check />
            {message}
          </div>
        )}
        {tab !== "finance" && tab !== "integrations" && (
          <div className="admin-summary">
            {tab === "inventory" ? (
              <>
                <Card
                  icon={<Database />}
                  label="Produtos publicados"
                  value={summary.products}
                />
                <Card
                  icon={<PackageSearch />}
                  label="Rascunhos do Bling"
                  value={summary.drafts}
                />
                <Card
                  icon={<PackageSearch />}
                  label="Com preço"
                  value={summary.priced}
                />
                <Card
                  icon={<Boxes />}
                  label="Com saldo informado"
                  value={summary.stockDefined}
                />
                <Card
                  icon={<ShoppingBag />}
                  label="Pedidos"
                  value={summary.orders}
                />
              </>
            ) : (
              <>
                <Card
                  icon={<ShoppingBag />}
                  label="Aguardando pagamento"
                  value={orderMetrics.awaiting}
                />
                <Card
                  icon={<ClipboardCheck />}
                  label="Para separar"
                  value={orderMetrics.packing}
                />
                <Card
                  icon={<Truck />}
                  label="Em transporte"
                  value={orderMetrics.shipped}
                />
                <Card
                  icon={<Check />}
                  label="Entregues"
                  value={orderMetrics.completed}
                />
              </>
            )}
          </div>
        )}
        {tab === "inventory" ? (
          <Inventory
            products={products}
            query={query}
            filter={inventoryFilter}
            loading={loading}
            setQuery={setQuery}
            setFilter={(next) => {
              setInventoryFilter(next);
              loadProducts(query, next);
            }}
            setProducts={setProducts}
            search={() => loadProducts(query)}
            save={save}
          />
        ) : tab === "orders" ? (
          <Orders orders={orders} loading={loading} updateOrder={updateOrder} />
        ) : tab === "finance" ? (
          <Finance orders={orders} loading={loading} />
        ) : (
          <BlingIntegration status={bling} loading={loading} />
        )}
      </section>
    </main>
  );
}

function BlingIntegration({ status, loading }: { status: BlingStatus | null; loading: boolean }) {
  if (loading) return <div className="admin-loading"><LoaderCircle className="spin" /> Carregando integração...</div>;
  if (!status) return <div className="admin-empty"><PlugZap /><h2>Integração indisponível</h2><p>Não foi possível consultar o Bling.</p></div>;
  return (
    <section className="integration-panel">
      <div className="integration-card">
        <span className={`integration-mark ${status.connected ? "ok" : ""}`}><PlugZap /></span>
        <div>
          <small>ERP E ESTOQUE OFICIAL</small>
          <h2>Bling</h2>
          <p>
            {!status.configured
              ? "Cadastre as credenciais do aplicativo no Worker antes de conectar."
              : !status.connected
                ? "As credenciais estão prontas. Autorize a conta Bling para iniciar a conciliação."
                : status.enabled
                  ? "Integração ativa: pedidos pagos e estoque serão sincronizados automaticamente."
                  : "Conta conectada em modo seguro. Confira os SKUs antes de ativar os pedidos automáticos."}
          </p>
        </div>
        {status.configured && !status.connected && <a href="/api/admin/bling/connect">Conectar Bling</a>}
        {status.connected && <b className={status.enabled ? "active" : "standby"}>{status.enabled ? "Ativa" : "Em preparação"}</b>}
      </div>
      <div className="integration-metrics">
        <article><small>Produtos no site</small><b>{status.products.total}</b></article>
        <article><small>SKUs vinculados</small><b>{status.products.linked}</b></article>
        <article><small>Estoque pelo Bling</small><b>{status.products.official}</b></article>
        <article><small>Aguardando revisão</small><b>{status.products.drafts}</b></article>
      </div>
      <div className="integration-note">
        <ShieldCheck />
        <span><b>Proteção contra baixa duplicada</b><small>O saldo recebido do Bling substitui o saldo oficial e desconta apenas reservas locais ainda não enviadas ao ERP.</small></span>
      </div>
    </section>
  );
}

function Card({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article>
      {icon}
      <span>
        <small>{label}</small>
        <b>{value.toLocaleString("pt-BR")}</b>
      </span>
    </article>
  );
}

function Finance({ orders, loading }: { orders: Order[]; loading: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 8)}01`);
  const [dateTo, setDateTo] = useState(today);
  if (loading) return <Loading />;
  const periodOrders = orders.filter((order) => {
    const date = new Date(order.createdAt.replace(" ", "T") + "Z")
      .toISOString()
      .slice(0, 10);
    return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  });
  const confirmedStatuses = new Set([
    "paid",
    "processing",
    "shipped",
    "delivered",
  ]);
  const confirmed = periodOrders.filter((order) =>
    confirmedStatuses.has(order.status),
  );
  const revenue = confirmed.reduce((sum, order) => sum + order.totalCents, 0);
  const average = confirmed.length ? Math.round(revenue / confirmed.length) : 0;
  const awaiting = periodOrders
    .filter((order) => order.status === "awaiting_payment")
    .reduce((sum, order) => sum + order.totalCents, 0);
  const products = new Map<
    string,
    { code: string; name: string; quantity: number; revenue: number }
  >();
  for (const order of confirmed) {
    for (const item of order.items || []) {
      const current = products.get(item.itemKey) || {
        code: item.itemKey,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.unitPriceCents * item.quantity;
      products.set(item.itemKey, current);
    }
  }
  const topProducts = [...products.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const statusData = Object.entries(statusLabels).map(([status, label]) => ({
    status,
    label,
    count: periodOrders.filter((order) => order.status === status).length,
  }));
  const maxStatus = Math.max(1, ...statusData.map((item) => item.count));
  const exportCsv = () => {
    const cell = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = periodOrders.map((order) => [
      order.id,
      new Date(order.createdAt.replace(" ", "T") + "Z").toLocaleString("pt-BR"),
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      statusLabels[order.status] || order.status,
      (order.totalCents / 100).toFixed(2).replace(".", ","),
      order.paymentMode === "test" ? `${order.paymentProvider} (TESTE)` : order.paymentProvider,
      order.shippingCarrier,
      order.trackingCode,
      (order.items || [])
        .map((item) => `${item.itemKey} - ${item.name} (${item.quantity}x)`)
        .join(" | "),
    ]);
    const headers = [
      "Pedido",
      "Data",
      "Cliente",
      "E-mail",
      "Telefone",
      "Status",
      "Total (R$)",
      "Pagamento",
      "Transportadora",
      "Rastreio",
      "Itens",
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `highparts-vendas-${dateFrom || "inicio"}-${dateTo || "hoje"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="finance-dashboard">
      <section className="finance-toolbar">
        <div>
          <label>
            Data inicial
            <input
              type="date"
              value={dateFrom}
              max={dateTo || today}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label>
            Data final
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={today}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
        </div>
        <span>
          {periodOrders.length}{" "}
          {periodOrders.length === 1 ? "pedido" : "pedidos"} no período
        </span>
        <button onClick={exportCsv} disabled={!periodOrders.length}>
          <Download /> Exportar CSV
        </button>
      </section>
      <section className="finance-kpis">
        <FinanceCard
          label="Faturamento no período"
          value={money(revenue)}
          detail={`${confirmed.length} pedidos pagos`}
          icon={<TrendingUp />}
        />
        <FinanceCard
          label="Pedidos confirmados"
          value={confirmed.length.toLocaleString("pt-BR")}
          detail="Pagos, separados, enviados ou entregues"
          icon={<BarChart3 />}
        />
        <FinanceCard
          label="Ticket médio"
          value={money(average)}
          detail="Média por pedido confirmado"
          icon={<ShoppingBag />}
        />
        <FinanceCard
          label="Aguardando pagamento"
          value={money(awaiting)}
          detail={`${periodOrders.filter((order) => order.status === "awaiting_payment").length} pedidos pendentes`}
          icon={<ClipboardCheck />}
        />
      </section>
      <section className="finance-panels">
        <article className="finance-chart">
          <header>
            <span>
              <small>OPERAÇÃO</small>
              <h2>Pedidos por etapa</h2>
            </span>
            <b>{periodOrders.length} pedidos</b>
          </header>
          <div>
            {statusData.map((item) => (
              <div className="finance-bar" key={item.status}>
                <span>{item.label}</span>
                <i>
                  <b style={{ width: `${(item.count / maxStatus) * 100}%` }} />
                </i>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="top-products">
          <header>
            <span>
              <small>DESEMPENHO</small>
              <h2>Peças mais vendidas</h2>
            </span>
          </header>
          {topProducts.length ? (
            topProducts.map((product, index) => (
              <div key={product.code}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <span>
                  <b>{product.name}</b>
                  <small>{product.code}</small>
                </span>
                <strong>{product.quantity} un.</strong>
                <em>{money(product.revenue)}</em>
              </div>
            ))
          ) : (
            <p>Nenhuma venda confirmada para calcular o ranking.</p>
          )}
        </article>
      </section>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article>
      <div>{icon}</div>
      <small>{label}</small>
      <b>{value}</b>
      <span>{detail}</span>
    </article>
  );
}
function Inventory({
  products,
  query,
  filter,
  loading,
  setQuery,
  setFilter,
  setProducts,
  search,
  save,
}: {
  products: Product[];
  query: string;
  filter: InventoryFilter;
  loading: boolean;
  setQuery: (q: string) => void;
  setFilter: (filter: InventoryFilter) => void;
  setProducts: (p: Product[]) => void;
  search: () => void;
  save: (p: Product) => void;
}) {
  return (
    <div className="inventory">
      <div className="inventory-filters">
        <button
          className={filter === "bling-draft" ? "active" : ""}
          onClick={() => setFilter("bling-draft")}
        >
          Novos do Bling
        </button>
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        <button
          className={filter === "missing-price" ? "active" : ""}
          onClick={() => setFilter("missing-price")}
        >
          Sem preço
        </button>
        <button
          className={filter === "missing-stock" ? "active" : ""}
          onClick={() => setFilter("missing-stock")}
        >
          Sem estoque
        </button>
        <button
          className={filter === "missing-shipping" ? "active" : ""}
          onClick={() => setFilter("missing-shipping")}
        >
          Sem dados de frete
        </button>
        <button
          className={filter === "ready" ? "active" : ""}
          onClick={() => setFilter("ready")}
        >
          Prontos para venda
        </button>
      </div>
      <div className="inventory-head">
        <div className="admin-search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Buscar código, produto ou aplicação"
          />
          <button onClick={search}>Buscar</button>
        </div>
        <span>{products.length} resultados nesta página</span>
      </div>
      {loading ? (
        <Loading />
      ) : products.length ? (
        <div className="inventory-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto e aplicação</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Frete</th>
                <th>Imagem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <ProductRow
                  key={p.code}
                  product={p}
                  onChange={(next) =>
                    setProducts(products.map((x, n) => (n === i ? next : x)))
                  }
                  onSave={(next) => save(next || p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty">
          <Database />
          <h2>Nenhum produto encontrado</h2>
          <p>Altere a busca ou selecione outro filtro.</p>
        </div>
      )}
    </div>
  );
}
function Orders({
  orders,
  loading,
  updateOrder,
}: {
  orders: Order[];
  loading: boolean;
  updateOrder: (
    order: Order,
    changes: {
      status: string;
      shippingCarrier: string;
      shippingService: string;
      trackingCode: string;
      packedItems: string[];
    },
  ) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        status: string;
        shippingCarrier: string;
        shippingService: string;
        trackingCode: string;
        packedItems: string[];
      }
    >
  >({});
  const [saving, setSaving] = useState(false);
  const draftFor = (order: Order) =>
    drafts[order.id] || {
      status: order.status,
      shippingCarrier: order.shippingCarrier || "",
      shippingService: order.shippingService || "",
      trackingCode: order.trackingCode || "",
      packedItems: order.items
        .filter((item) => item.packed)
        .map((item) => item.itemKey),
    };
  const patchDraft = (
    order: Order,
    change: Partial<ReturnType<typeof draftFor>>,
  ) =>
    setDrafts((current) => ({
      ...current,
      [order.id]: { ...draftFor(order), ...current[order.id], ...change },
    }));
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleOrders = orders.filter((order) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "open"
        ? !["delivered", "cancelled"].includes(order.status)
        : filter === "packing"
          ? ["paid", "processing"].includes(order.status)
          : order.status === filter);
    const matchesQuery =
      !normalizedQuery ||
      [
        order.id,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.trackingCode,
      ].some((value) =>
        String(value || "")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery),
      );
    return matchesFilter && matchesQuery;
  });
  return (
    <div className="inventory admin-orders">
      {loading ? (
        <Loading />
      ) : orders.length ? (
        <>
          <div className="order-operations-toolbar">
            <div className="admin-search">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pedido, cliente, telefone ou rastreio"
                aria-label="Buscar pedidos"
              />
            </div>
            <div className="inventory-filters">
              {[
                ["open", "Em aberto"],
                ["all", "Todos"],
                ["awaiting_payment", "Aguardando"],
                ["packing", "Separação"],
                ["shipped", "Enviados"],
                ["delivered", "Entregues"],
                ["cancelled", "Cancelados"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span>
              {visibleOrders.length}{" "}
              {visibleOrders.length === 1 ? "pedido" : "pedidos"}
            </span>
          </div>
          {visibleOrders.length ? (
            <div className="fulfillment-list">
              {visibleOrders.map((order) => {
                const draft = draftFor(order);
                const opened = selected === order.id;
                const packedCount = draft.packedItems.length;
                return (
                  <article
                    className={`fulfillment-order ${opened ? "open" : ""}`}
                    key={order.id}
                  >
                    <button
                      className="fulfillment-summary"
                      onClick={() => setSelected(opened ? null : order.id)}
                    >
                      <span>
                        <small>PEDIDO</small>
                        <b>{order.id}</b>
                      </span>
                      <span>
                        <small>CLIENTE</small>
                        <b>{order.customerName}</b>
                        <em>{order.customerEmail}</em>
                      </span>
                      <span>
                        <small>SEPARAÇÃO</small>
                        <b>
                          {packedCount}/{order.items.length} itens
                        </b>
                      </span>
                      <span>
                        <small>TOTAL</small>
                        <b>{money(order.totalCents)}</b>
                      </span>
                      <i className={`status-${order.status}`}>
                        {statusLabels[order.status] || order.status}
                        {order.paymentMode === "test" && " · TESTE"}
                      </i>
                    </button>
                    {opened && (
                      <div className="fulfillment-body">
                        <div className="fulfillment-customer">
                          <section>
                            <MapPin />
                            <span>
                              <small>ENTREGA</small>
                              <b>
                                {order.shippingAddress ||
                                  "Endereço não informado"}
                              </b>
                            </span>
                          </section>
                          <section>
                            <ShoppingBag />
                            <span>
                              <small>CONTATO</small>
                              <b>{order.customerPhone || "Sem telefone"}</b>
                              <em>{order.customerEmail}</em>
                            </span>
                          </section>
                        </div>
                        <div className="packing-checklist">
                          <header>
                            <ClipboardCheck />
                            <span>
                              <small>CHECKLIST</small>
                              <h3>Separação das peças</h3>
                            </span>
                            <b>
                              {packedCount}/{order.items.length}
                            </b>
                          </header>
                          {order.items.map((item) => (
                            <label key={item.itemKey}>
                              <input
                                type="checkbox"
                                checked={draft.packedItems.includes(
                                  item.itemKey,
                                )}
                                onChange={(event) =>
                                  patchDraft(order, {
                                    packedItems: event.target.checked
                                      ? [...draft.packedItems, item.itemKey]
                                      : draft.packedItems.filter(
                                          (code) => code !== item.itemKey,
                                        ),
                                  })
                                }
                              />
                              <span>
                                <b>{item.name}</b>
                                <small>
                                  {item.itemKey} • {item.quantity}{" "}
                                  {item.quantity === 1 ? "unidade" : "unidades"}
                                </small>
                              </span>
                              <strong>
                                {money(item.unitPriceCents * item.quantity)}
                              </strong>
                            </label>
                          ))}
                        </div>
                        <div className="shipping-editor">
                          <header>
                            <Truck />
                            <span>
                              <small>EXPEDIÇÃO</small>
                              <h3>Envio e rastreamento</h3>
                            </span>
                          </header>
                          <div>
                            <label>
                              Transportadora
                              <input
                                value={draft.shippingCarrier}
                                onChange={(e) =>
                                  patchDraft(order, {
                                    shippingCarrier: e.target.value,
                                  })
                                }
                                placeholder="Ex.: Correios, Jadlog"
                              />
                            </label>
                            <label>
                              Serviço
                              <input
                                value={draft.shippingService}
                                onChange={(e) =>
                                  patchDraft(order, {
                                    shippingService: e.target.value,
                                  })
                                }
                                placeholder="Ex.: PAC, Expresso"
                              />
                            </label>
                            <label>
                              Código de rastreio
                              <input
                                value={draft.trackingCode}
                                onChange={(e) =>
                                  patchDraft(order, {
                                    trackingCode: e.target.value.toUpperCase(),
                                  })
                                }
                                placeholder="Código fornecido pela transportadora"
                              />
                            </label>
                            <label>
                              Status
                              <select
                                value={draft.status}
                                disabled={order.status === "cancelled"}
                                onChange={(e) =>
                                  patchDraft(order, { status: e.target.value })
                                }
                              >
                                {Object.entries(statusLabels).map(
                                  ([value, label]) => (
                                    <option value={value} key={value}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                          </div>
                          <button
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true);
                              const ok = await updateOrder(order, draft);
                              setSaving(false);
                              if (ok)
                                setDrafts((current) => {
                                  const next = { ...current };
                                  delete next[order.id];
                                  return next;
                                });
                            }}
                          >
                            <Save />
                            {saving ? "Salvando..." : "Salvar andamento"}
                          </button>
                          <small>
                            Ao mudar o status, o cliente será avisado por
                            e-mail. Cancelamentos devolvem as quantidades ao
                            estoque.
                          </small>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty order-empty">
              <PackageSearch />
              <h2>Nenhum pedido encontrado</h2>
              <p>Altere a busca ou escolha outro filtro de andamento.</p>
            </div>
          )}
        </>
      ) : (
        <div className="admin-empty">
          <ShoppingBag />
          <h2>Nenhum pedido ainda</h2>
          <p>Os pedidos criados no checkout aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
}
function Loading() {
  return (
    <div className="admin-loading">
      <LoaderCircle className="spin" />
      Carregando...
    </div>
  );
}
function ProductRow({
  product: p,
  onChange,
  onSave,
}: {
  product: Product;
  onChange: (p: Product) => void;
  onSave: (product?: Product) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    let prepared: File;
    try {
      prepared = await prepareProductImage(file);
    } catch (error) {
      setUploading(false);
      window.alert(error instanceof Error ? error.message : "Não foi possível preparar a imagem.");
      return;
    }
    const form = new FormData();
    form.set("image", prepared);
    const response = await fetch(`/api/admin/catalog/${encodeURIComponent(p.code)}/image`, {
      method: "POST",
      body: form,
    });
    const result = await response.json().catch(() => ({})) as { imageUrl?: string; error?: string };
    setUploading(false);
    if (!response.ok || !result.imageUrl) {
      window.alert(result.error || "Não foi possível enviar a imagem.");
      return;
    }
    onChange({ ...p, imageUrl: result.imageUrl });
  };
  const imageField = (
    <div className="admin-image-field">
      {p.imageUrl ? <img src={p.imageUrl} alt={`Imagem de ${p.code}`} /> : <div className="admin-image-placeholder">Sem imagem</div>}
      <input className="image-input" type="url" value={p.imageUrl ?? ""} placeholder="https://... ou /products/..." aria-label={`Imagem de ${p.code}`} onChange={(e) => onChange({ ...p, imageUrl: e.target.value || null })} />
      <input ref={fileInput} className="admin-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { void uploadImage(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <button className="upload-image" type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>
        {uploading ? <LoaderCircle className="spin" /> : <Upload />} {uploading ? "Enviando..." : "Enviar imagem"}
      </button>
      <small>JPG, PNG ou WebP · compactação automática</small>
    </div>
  );
  if (p.blingDraft) return (
    <tr className="bling-draft-row">
      <td>
        <b>{p.code}</b>
        <small className="draft-badge">NOVO DO BLING</small>
      </td>
      <td>
        <small>Nome no Bling</small>
        <b>{p.blingName || "Produto sem nome"}</b>
        <label>Categoria
          <input value={p.product} placeholder="Ex.: DISCO DE FREIO" onChange={(e) => onChange({ ...p, product: e.target.value })} />
        </label>
        <label>Aplicações compatíveis
          <textarea value={p.application} placeholder="Ex.: [VW] GOL 1.6 2018>2022" onChange={(e) => onChange({ ...p, application: e.target.value })} />
        </label>
        <div className="draft-inline-fields">
          <label>Eixo
            <select value={p.axle} onChange={(e) => onChange({ ...p, axle: e.target.value })}>
              <option value="">Selecione</option><option value="DIANTEIRO">Dianteiro</option><option value="TRASEIRO">Traseiro</option><option value="DIANTEIRO / TRASEIRO">Dianteiro / traseiro</option>
            </select>
          </label>
          <label>Referências
            <input value={p.originalCode} placeholder="Códigos originais" onChange={(e) => onChange({ ...p, originalCode: e.target.value })} />
          </label>
        </div>
      </td>
      <td><b>{p.priceCents == null ? "Aguardando Bling" : money(p.priceCents)}</b></td>
      <td><b>{p.stockQuantity == null ? "Aguardando Bling" : p.stockQuantity}</b></td>
      <td><ShippingFields product={p} onChange={onChange} /></td>
      <td>{imageField}</td>
      <td className="draft-actions">
        <button className="save-product secondary-save" onClick={() => onSave(p)}><Save /> Salvar rascunho</button>
        <button className="save-product publish-product" onClick={() => onSave({ ...p, active: true })}><Check /> Publicar</button>
      </td>
    </tr>
  );
  return (
    <tr>
      <td>
        <b>{p.code}</b>
        <small>{p.axle}</small>
      </td>
      <td>
        <b>{p.product}</b>
        <small>
          {p.application.slice(0, 135)}
          {p.application.length > 135 ? "…" : ""}
        </small>
      </td>
      <td>
        <b>{p.priceCents == null ? "Aguardando Bling" : money(p.priceCents)}</b>
      </td>
      <td>
        <b>{p.stockQuantity == null ? "Aguardando Bling" : p.stockQuantity}</b>
      </td>
      <td>
        <ShippingFields product={p} onChange={onChange} />
      </td>
      <td>
        {imageField}
      </td>
      <td>
        <button className="save-product" onClick={onSave}>
          <Save /> Salvar
        </button>
      </td>
    </tr>
  );
}

// Weight (kg) and package dimensions (cm) used for freight quotes. Values that
// exist in Bling are synced and take precedence; the rest are typed here.
function ShippingFields({ product: p, onChange }: { product: Product; onChange: (p: Product) => void }) {
  const complete = Boolean(p.weightGrams && p.lengthCm && p.widthCm && p.heightCm);
  const number = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const dimension = (key: "lengthCm" | "widthCm" | "heightCm", label: string) => (
    <label>
      <small>{label}</small>
      <input type="number" min="0" step="0.1" inputMode="decimal" value={p[key] ?? ""} aria-label={`${label} (cm) de ${p.code}`}
        onChange={(e) => onChange({ ...p, [key]: number(e.target.value) })} />
    </label>
  );
  return (
    <div className="admin-shipping-fields">
      <span className={`shipping-badge ${complete ? (p.shippingDataSource === "bling" ? "from-bling" : "manual") : "missing"}`}>
        {complete ? (p.shippingDataSource === "bling" ? "Do Bling" : "Manual") : "Faltando"}
      </span>
      <label className="weight">
        <small>Peso (kg)</small>
        <input type="number" min="0" step="0.01" inputMode="decimal" value={p.weightGrams == null ? "" : p.weightGrams / 1000}
          aria-label={`Peso (kg) de ${p.code}`}
          onChange={(e) => { const kg = number(e.target.value); onChange({ ...p, weightGrams: kg == null ? null : Math.round(kg * 1000) }); }} />
      </label>
      <div className="dims">
        {dimension("lengthCm", "Compr.")}
        {dimension("widthCm", "Larg.")}
        {dimension("heightCm", "Alt.")}
      </div>
      <small className="shipping-hint">Medidas da embalagem, em cm</small>
    </div>
  );
}
