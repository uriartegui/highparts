"use client";

import { useEffect, useState } from "react";
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
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  TrendingUp,
} from "lucide-react";

type Product = {
  code: string;
  product: string;
  application: string;
  axle: string;
  type: string;
  priceCents: number | null;
  stockQuantity: number | null;
  imageUrl: string | null;
  active: boolean;
};
type Summary = {
  products: number;
  priced: number;
  stockDefined: number;
  orders: number;
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
type Tab = "inventory" | "orders" | "finance";
type InventoryFilter = "all" | "missing-price" | "missing-stock" | "ready";
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
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
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
  useEffect(() => {
    loadProducts();
  }, []);
  const changeTab = (next: Tab) => {
    setTab(next);
    setMessage("");
    if (next === "orders" || next === "finance") loadOrders();
    else loadProducts(query);
  };
  const sync = async () => {
    setSyncing(true);
    setMessage("");
    const r = await fetch("/api/admin/catalog/sync", { method: "POST" });
    const d = (await r.json()) as { imported?: number; error?: string };
    setMessage(
      r.ok
        ? `${(d.imported ?? 0).toLocaleString("pt-BR")} produtos sincronizados.`
        : d.error || "Falha ao sincronizar.",
    );
    setSyncing(false);
    if (r.ok) loadProducts();
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
                  : "DESEMPENHO HIGHPARTS"}
            </small>
            <h1>
              {tab === "inventory"
                ? "Produtos e estoque"
                : tab === "orders"
                  ? "Pedidos recebidos"
                  : "Visão financeira"}
            </h1>
            <p>
              {tab === "inventory"
                ? "Informe preço, saldo e imagem para liberar cada produto na loja."
                : tab === "orders"
                  ? "Consulte clientes, valores e atualize o andamento de cada venda."
                  : "Acompanhe vendas confirmadas, ticket médio e produtos com maior saída."}
            </p>
          </div>
          {tab === "inventory" && (
            <button onClick={sync} disabled={syncing}>
              {syncing ? <LoaderCircle className="spin" /> : <RefreshCw />}
              {syncing ? "Sincronizando..." : "Sincronizar planilha"}
            </button>
          )}
        </header>
        {message && (
          <div className="admin-message">
            <Check />
            {message}
          </div>
        )}
        {tab !== "finance" && (
          <div className="admin-summary">
            {tab === "inventory" ? (
              <>
                <Card
                  icon={<Database />}
                  label="Produtos importados"
                  value={summary.products}
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
        ) : (
          <Finance orders={orders} loading={loading} />
        )}
      </section>
    </main>
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
                <th>Imagem</th>
                <th>Ativo</th>
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
                  onSave={() => save(p)}
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
  onSave: () => void;
}) {
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
        <label>
          R$
          <input
            type="number"
            min="0"
            step="0.01"
            value={p.priceCents == null ? "" : (p.priceCents / 100).toFixed(2)}
            onChange={(e) =>
              onChange({
                ...p,
                priceCents:
                  e.target.value === ""
                    ? null
                    : Math.round(Number(e.target.value) * 100),
              })
            }
          />
        </label>
      </td>
      <td>
        <input
          className="stock-input"
          type="number"
          min="0"
          value={p.stockQuantity ?? ""}
          placeholder="—"
          onChange={(e) =>
            onChange({
              ...p,
              stockQuantity:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </td>
      <td>
        <input
          className="image-input"
          type="url"
          value={p.imageUrl ?? ""}
          placeholder="https://..."
          aria-label={`Imagem de ${p.code}`}
          onChange={(e) => onChange({ ...p, imageUrl: e.target.value || null })}
        />
      </td>
      <td>
        <button
          className={`toggle ${p.active ? "on" : ""}`}
          onClick={() => onChange({ ...p, active: !p.active })}
        >
          <i />
        </button>
      </td>
      <td>
        <button className="save-product" onClick={onSave}>
          <Save /> Salvar
        </button>
      </td>
    </tr>
  );
}
