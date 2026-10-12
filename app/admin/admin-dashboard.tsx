"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Check,
  ChevronLeft,
  Database,
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
type Tab = "inventory" | "orders";
type InventoryFilter = "all" | "missing-price" | "missing-stock" | "ready";
const statusLabels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
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
    if (next === "orders") loadOrders();
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
              {tab === "inventory" ? "CATÁLOGO HIGHPARTS" : "VENDAS HIGHPARTS"}
            </small>
            <h1>
              {tab === "inventory" ? "Produtos e estoque" : "Pedidos recebidos"}
            </h1>
            <p>
              {tab === "inventory"
                ? "Informe preço, saldo e imagem para liberar cada produto na loja."
                : "Consulte clientes, valores e atualize o andamento de cada venda."}
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
        <div className="admin-summary">
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
          <Card icon={<ShoppingBag />} label="Pedidos" value={summary.orders} />
        </div>
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
        ) : (
          <Orders orders={orders} loading={loading} updateOrder={updateOrder} />
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
  return (
    <div className="inventory admin-orders">
      {loading ? (
        <Loading />
      ) : orders.length ? (
        <div className="fulfillment-list">
          {orders.map((order) => {
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
                            {order.shippingAddress || "Endereço não informado"}
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
                            checked={draft.packedItems.includes(item.itemKey)}
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
                        Ao mudar o status, o cliente será avisado por e-mail.
                        Cancelamentos devolvem as quantidades ao estoque.
                      </small>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
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
