import { Car, PackageCheck, ShieldCheck, Truck } from "lucide-react";

// Dark title band shared by inner pages, matching the catalog hero.
export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: React.ReactNode; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="hp-hero">
      <div className="hp-container">
        <small className="hp-eyebrow hp-reveal">{eyebrow}</small>
        <h1 className="hp-reveal">{title}</h1>
        {text && <p className="hp-reveal">{text}</p>}
        {children}
      </div>
    </section>
  );
}

type Action = { href: string; label: string; variant?: "primary" | "dark" | "ghost" };

// Centered state for empty, restricted, success or error screens.
export function StatePanel({ icon, tone = "neutral", eyebrow, title, text, actions = [], children }: { icon?: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger"; eyebrow?: string; title: React.ReactNode; text?: React.ReactNode; actions?: Action[]; children?: React.ReactNode }) {
  return (
    <section className="hp-state">
      <div className={`hp-state-card hp-card hp-reveal tone-${tone}`}>
        {icon && <i className="hp-state-icon">{icon}</i>}
        {eyebrow && <small className="hp-eyebrow">{eyebrow}</small>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
        {children}
        {actions.length > 0 && (
          <div className="hp-actions">
            {actions.map((action) => (
              <a key={action.href + action.label} className={`hp-btn hp-btn-${action.variant ?? "primary"}`} href={action.href}>{action.label}</a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const perks = [
  { icon: <Car />, title: "Sua garagem", text: "Veículos salvos para buscar a peça certa mais rápido." },
  { icon: <PackageCheck />, title: "Pedidos em um só lugar", text: "Acompanhe pagamento, separação e envio." },
  { icon: <Truck />, title: "Endereços salvos", text: "Checkout mais rápido nas próximas compras." },
  { icon: <ShieldCheck />, title: "Conta protegida", text: "Senha criptografada e verificação de e-mail." },
];

// Two-column account layout: brand panel + form card (light, Apple-style).
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="hp-auth">
      <div className="hp-auth-grid hp-container">
        <aside className="hp-auth-aside hp-reveal" aria-hidden="true">
          <small className="hp-eyebrow">CONTA HIGHPARTS</small>
          <h2>A peça certa, com a segurança de saber que serve.</h2>
          <ul>
            {perks.map((perk) => (
              <li key={perk.title}>
                <i>{perk.icon}</i>
                <span><b>{perk.title}</b><small>{perk.text}</small></span>
              </li>
            ))}
          </ul>
        </aside>
        <div className="hp-auth-card hp-card hp-reveal">{children}</div>
      </div>
    </section>
  );
}
