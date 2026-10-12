"use client";

import {
  ChevronLeft,
  Minus,
  PackageOpen,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StoreHeader from "../store-header";

type Product = {
  code: string;
  product: string;
  application: string;
  axle: string;
  priceCents: number | null;
  stockQuantity: number | null;
  imageUrl: string | null;
};

const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CartPage() {
  const [cart, setCart] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const local = JSON.parse(
        localStorage.getItem("highparts_cart") || "[]",
      ) as string[];
      const me = await fetch("/api/auth/me")
        .then((r) => r.json() as Promise<{ user?: { name: string } | null }>)
        .catch(() => ({ user: null }));
      if (!me.user) {
        location.replace("/entrar?returnTo=/carrinho");
        return;
      }
      setUserName(me.user?.name || null);
      let selected = local;
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
        if (remote.length) selected = remote;
      }
      setCart(selected);
      const codes = [...new Set(selected)];
      if (codes.length) {
        const params = new URLSearchParams({
          codes: codes.join(","),
          limit: String(Math.min(100, codes.length)),
        });
        const data = await fetch(`/api/catalog?${params}`)
          .then((r) => r.json() as Promise<{ products?: Product[] }>)
          .catch(() => ({ products: [] }));
        setProducts(data.products || []);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("highparts_cart", JSON.stringify(cart));
    if (userName) {
      const items = [...new Set(cart)].flatMap((code) => {
        const product = products.find((item) => item.code === code);
        if (!product) return [];
        return [
          {
            itemKey: code,
            name: product.product,
            fit: product.application,
            priceCents: product.priceCents || 0,
            quantity: cart.filter((item) => item === code).length,
          },
        ];
      });
      fetch("/api/account/cart", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      }).catch(() => {});
    }
  }, [cart, products, ready, userName]);

  const rows = useMemo(
    () =>
      [...new Set(cart)].flatMap((code) => {
        const product = products.find((item) => item.code === code);
        return product
          ? [{ product, quantity: cart.filter((item) => item === code).length }]
          : [];
      }),
    [cart, products],
  );
  const subtotal = rows.reduce(
    (sum, row) => sum + (row.product.priceCents || 0) * row.quantity,
    0,
  );
  const change = (code: string, direction: 1 | -1) => {
    if (direction === 1) setCart((current) => [...current, code]);
    else
      setCart((current) => {
        const next = [...current];
        const index = next.lastIndexOf(code);
        if (index >= 0) next.splice(index, 1);
        return next;
      });
  };

  return (
    <main className="cart-page">
      <StoreHeader userName={userName} cartCount={cart.length} />
      <section className="cart-shell">
        <a className="cart-back" href="/catalogo">
          <ChevronLeft /> Continuar comprando
        </a>
        <div className="cart-heading">
          <small>SEU CARRINHO</small>
          <h1>Revise suas peças.</h1>
          <p>Confira códigos, aplicações e quantidades antes de seguir.</p>
        </div>
        {!ready ? (
          <div className="cart-page-empty">Carregando seu carrinho…</div>
        ) : rows.length === 0 ? (
          <div className="cart-page-empty">
            <PackageOpen />
            <h2>Seu carrinho está vazio.</h2>
            <p>Explore o catálogo técnico e adicione as peças que procura.</p>
            <a href="/catalogo">Ver catálogo</a>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-list">
              {rows.map(({ product, quantity }) => (
                <article className="cart-row" key={product.code}>
                  <a
                    className="cart-row-visual"
                    href={`/produto/${encodeURIComponent(product.code)}`}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.product} />
                    ) : (
                      <span>HP</span>
                    )}
                  </a>
                  <div className="cart-row-copy">
                    <small>{product.code}</small>
                    <h2>{product.product}</h2>
                    <p>{product.application}</p>
                    <a href={`/produto/${encodeURIComponent(product.code)}`}>
                      Ver detalhes
                    </a>
                  </div>
                  <div className="cart-row-actions">
                    <strong>
                      {product.priceCents == null
                        ? "Consulte"
                        : money(product.priceCents * quantity)}
                    </strong>
                    <div>
                      <button
                        onClick={() => change(product.code, -1)}
                        aria-label="Diminuir quantidade"
                      >
                        <Minus />
                      </button>
                      <b>{quantity}</b>
                      <button
                        onClick={() => change(product.code, 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus />
                      </button>
                    </div>
                    <button
                      className="cart-remove"
                      onClick={() =>
                        setCart((current) =>
                          current.filter((code) => code !== product.code),
                        )
                      }
                    >
                      <Trash2 /> Remover
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <aside className="cart-summary">
              <small>RESUMO</small>
              <h2>Seu pedido</h2>
              <p>
                <span>Produtos ({cart.length})</span>
                <b>{money(subtotal)}</b>
              </p>
              <p>
                <span>Frete</span>
                <b>Calculado no checkout</b>
              </p>
              <div>
                <span>Total</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <a href="/?checkout=1">Continuar para o checkout</a>
              <em>
                <ShieldCheck /> Compra protegida e dados seguros
              </em>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
