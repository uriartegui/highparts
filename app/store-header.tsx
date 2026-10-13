"use client";

import {
  ChevronDown,
  CircleUserRound,
  Headphones,
  Menu,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  userName?: string | null;
  cartCount?: number;
  onCart?: () => void;
  darkTopbar?: boolean;
};

const groups = [
  {
    label: "Catálogo",
    href: "/catalogo",
    panel: (
      <>
        <div>
          <small>POR CATEGORIA</small>
          <a href="/catalogo?categoria=DISCO%20DE%20FREIO">Discos de freio</a>
          <a href="/catalogo?categoria=TAMBOR%20DE%20FREIO">
            Tambores de freio
          </a>
          <a href="/catalogo?categoria=CILINDRO%20MESTRE">Cilindros mestre</a>
          <a href="/catalogo?categoria=CUBO%20DE%20RODA">Cubos de roda</a>
        </div>
        <div>
          <small>EXPLORAR</small>
          <a href="/catalogo">Todos os produtos</a>
          <a href="/catalogo?disponiveis=1">Pronta entrega</a>
          <a href="/catalogo?marca=VOLKSWAGEN">Volkswagen</a>
          <a href="/catalogo?marca=FIAT">Fiat</a>
        </div>
        <a className="nav-feature" href="/catalogo">
          <Sparkles />
          <span>
            <b>Catálogo técnico</b>
            <small>
              Busque por carro, código, aplicação, fabricante e eixo.
            </small>
          </span>
        </a>
      </>
    ),
  },
  {
    label: "Encontre sua peça",
    href: "/#compatibilidade",
    panel: (
      <>
        <div>
          <small>COMPATIBILIDADE</small>
          <a href="/#compatibilidade">Consultar pela placa</a>
          <a href="/#compatibilidade">Assistente guiado</a>
          <a href="/conta">Minha conta</a>
        </div>
        <a className="nav-feature wide" href="/#compatibilidade">
          <Search />
          <span>
            <b>Comece pela placa</b>
            <small>
              Identifique o veículo e refine a peça certa em poucos passos.
            </small>
          </span>
        </a>
      </>
    ),
  },
  {
    label: "Atendimento",
    href: "/#suporte",
    panel: (
      <>
        <div>
          <small>AJUDA</small>
          <a href="mailto:alisson@highparts.com.br">Fale com a HighParts</a>
          <a href="/trocas-e-devolucoes">Trocas e devoluções</a>
          <a href="/conta">Acompanhar pedido</a>
        </div>
        <a
          className="nav-feature light wide"
          href="mailto:alisson@highparts.com.br"
        >
          <Headphones />
          <span>
            <b>Suporte especialista</b>
            <small>Ajuda humana para confirmar sua aplicação.</small>
          </span>
        </a>
      </>
    ),
  },
];

export default function StoreHeader({
  userName,
  cartCount = 0,
  onCart,
  darkTopbar = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Frosted-glass header once the page scrolls (Apple-style).
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const openCart = () =>
    userName
      ? (onCart ?? (() => window.location.assign("/carrinho")))()
      : window.location.assign("/entrar?returnTo=/carrinho");
  return (
    <>
      {darkTopbar && (
        <div className="topbar">
          <span data-mobile="Compra segura">Compra segura</span>
          <span data-mobile="Compatível por veículo">
            Compatibilidade por veículo
          </span>
          <span data-mobile="Suporte especialista">
            Atendimento especialista
          </span>
        </div>
      )}
      <header className={`header store-header${scrolled ? " is-scrolled" : ""}`}>
        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X /> : <Menu />}
        </button>
        <a href="/" aria-label="HighParts — página inicial">
          <img className="logo" src="/highparts-logo.png" alt="HighParts" />
        </a>
        <nav className={open ? "open" : ""} aria-label="Navegação principal">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <a className="nav-root" href={group.href}>
                {group.label}
                <ChevronDown />
              </a>
              <div className="nav-panel">{group.panel}</div>
            </div>
          ))}
        </nav>
        <div className="header-actions">
          <a className="admin-link" href={userName ? "/conta" : "/entrar"}>
            <CircleUserRound /> {userName ? userName.split(" ")[0] : "Entrar"}
          </a>
          <button
            className="cart-icon"
            aria-label={`Abrir carrinho com ${cartCount} itens`}
            onClick={openCart}
          >
            <ShoppingCart />
            <b>{cartCount}</b>
          </button>
        </div>
      </header>
    </>
  );
}
