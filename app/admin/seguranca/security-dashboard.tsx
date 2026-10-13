"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, LockKeyhole, MailCheck, RefreshCw, ShieldAlert, UserPlus, XCircle } from "lucide-react";
import SiteShell from "../../site-shell";
import { PageHero } from "../../ui";

type Event = { id: string; type: string; userId: string | null; details: string; createdAt: string };
type Summary = { type: string; total: number };

const meta: Record<string, { label: string; tone: "ok" | "danger" | "info"; icon: React.ReactNode }> = {
  account_registered: { label: "Conta criada", tone: "info", icon: <UserPlus /> },
  login_succeeded: { label: "Login realizado", tone: "ok", icon: <CheckCircle2 /> },
  login_failed: { label: "Falha de login", tone: "danger", icon: <XCircle /> },
  login_locked: { label: "Conta temporariamente bloqueada", tone: "danger", icon: <LockKeyhole /> },
  email_verified: { label: "E-mail verificado", tone: "ok", icon: <MailCheck /> },
  verification_requested: { label: "Confirmação solicitada", tone: "info", icon: <MailCheck /> },
};
const describe = (type: string) => meta[type] ?? { label: type, tone: "info" as const, icon: <ShieldAlert /> };

function relative(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (seconds < 60) return format.format(-seconds, "second");
  if (seconds < 3600) return format.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return format.format(-Math.round(seconds / 3600), "hour");
  return format.format(-Math.round(seconds / 86400), "day");
}

const filters = [
  { id: "all", label: "Todos" },
  { id: "danger", label: "Falhas e bloqueios" },
  { id: "ok", label: "Sucessos" },
] as const;

export default function SecurityDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const load = () => {
    setLoading(true);
    fetch("/api/admin/security")
      .then((r) => r.json() as Promise<{ events?: Event[]; summary?: Summary[] }>)
      .then((d) => { setEvents(d.events ?? []); setSummary(d.summary ?? []); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const count = (...types: string[]) => summary.filter((row) => types.includes(row.type)).reduce((sum, row) => sum + Number(row.total), 0);
  const kpis = [
    { label: "Logins realizados", value: count("login_succeeded"), tone: "ok" },
    { label: "Falhas de login", value: count("login_failed"), tone: "danger" },
    { label: "Bloqueios temporários", value: count("login_locked"), tone: "danger" },
    { label: "Contas criadas", value: count("account_registered"), tone: "info" },
  ];
  const visible = useMemo(() => events.filter((event) => filter === "all" || describe(event.type).tone === filter), [events, filter]);

  return (
    <SiteShell>
      <PageHero eyebrow="SEGURANÇA HIGHPARTS" title="Eventos de autenticação" text="Últimos 50 eventos e o resumo dos últimos 7 dias. E-mails e endereços de rede não são exibidos.">
        <div className="hp-hero-actions hp-reveal">
          <a className="hp-btn hp-btn-ghost-dark" href="/admin"><ArrowLeft /> Painel administrativo</a>
          <button className="hp-btn hp-btn-primary" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> Atualizar</button>
        </div>
      </PageHero>
      <section className="hp-security hp-container">
        <div className="hp-kpis">
          {kpis.map((kpi) => (
            <article key={kpi.label} className={`hp-kpi hp-card hp-lift hp-reveal tone-${kpi.tone}`}>
              <small>{kpi.label}</small>
              <b>{loading ? "–" : kpi.value}</b>
              <span>últimos 7 dias</span>
            </article>
          ))}
        </div>
        <div className="hp-card hp-events hp-reveal">
          <header>
            <h2>Atividade recente</h2>
            <div className="hp-segmented" role="tablist">
              {filters.map((item) => (
                <button key={item.id} role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>
              ))}
            </div>
          </header>
          {loading ? (
            <div className="hp-events-empty"><LoaderCircle className="spin" /> Carregando eventos…</div>
          ) : visible.length ? (
            <ul>
              {visible.map((event) => {
                const info = describe(event.type);
                const date = new Date(event.createdAt.replace(" ", "T") + (event.createdAt.includes("Z") ? "" : "Z"));
                return (
                  <li key={event.id} className={`tone-${info.tone}`}>
                    <i>{info.icon}</i>
                    <span>
                      <b>{info.label}</b>
                      <small title={date.toLocaleString("pt-BR")}>{relative(date)} · {date.toLocaleString("pt-BR")}</small>
                    </span>
                    <code>{event.userId ? `usuário ${event.userId.slice(0, 8)}…` : "sem usuário identificado"}</code>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="hp-events-empty">Nenhum evento neste filtro.</div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
