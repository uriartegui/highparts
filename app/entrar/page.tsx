"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function LoginPage() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode); setError(""); setShowPassword(false); setShowConfirmation(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "register" && data.password !== data.confirmPassword) {
      setError("As senhas não coincidem."); setLoading(false); return;
    }
    const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Não foi possível continuar."); setLoading(false); return; }
    const requested = params.get("returnTo");
    window.location.href = requested?.startsWith("/") && !requested.startsWith("//") ? requested : result.user.role === "admin" ? "/admin" : "/conta";
  }

  return <main className="auth-page"><a href="/"><img src="/highparts-logo.png" alt="HighParts" /></a><section>
    <div className="auth-heading"><small>CONTA HIGHPARTS</small><h1>{mode === "login" ? "Bem-vindo de volta." : "Crie sua conta."}</h1><p>Carrinho, veículos e pedidos ficam salvos com segurança.</p></div>
    <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Entrar</button><button className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Criar conta</button></div>
    <form onSubmit={submit}>
      {mode === "register" && <><label>Nome completo<input name="name" required minLength={2} autoComplete="name" /></label><label>Telefone<input name="phone" type="tel" inputMode="numeric" placeholder="(00) 00000-0000" required maxLength={15} autoComplete="tel" onChange={event => { event.currentTarget.value = formatPhone(event.currentTarget.value); }} /></label></>}
      <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
      <label>Senha<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
      {mode === "register" && <label>Confirmar senha<span className="password-field"><input name="confirmPassword" type={showConfirmation ? "text" : "password"} required minLength={8} autoComplete="new-password" /><button type="button" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}>{showConfirmation ? <EyeOff /> : <Eye />}</button></span></label>}
      {error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}</button>
    </form><div className="auth-secure"><ShieldCheck /><span><b>Sessão protegida</b><small>Senha criptografada e cookie seguro.</small></span></div>
  </section></main>;
}
