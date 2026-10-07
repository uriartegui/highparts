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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode); setError(""); setFieldErrors({}); setShowPassword(false); setShowConfirmation(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setFieldErrors({});
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      else if (result.field) setFieldErrors({ [result.field]: result.error });
      else setError(result.error ?? "Não foi possível continuar.");
      setLoading(false); return;
    }
    const requested = params.get("returnTo");
    window.location.href = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  }

  return <main className="auth-page"><a href="/"><img src="/highparts-logo.png" alt="HighParts" /></a><section>
    <div className="auth-heading"><small>CONTA HIGHPARTS</small><h1>{mode === "login" ? "Bem-vindo de volta." : "Crie sua conta."}</h1><p>Carrinho, veículos e pedidos ficam salvos com segurança.</p></div>
    <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Entrar</button><button className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Criar conta</button></div>
    <form onSubmit={submit} noValidate>
      {mode === "register" && <><label className={fieldErrors.name ? "field-invalid" : ""}>Nome completo<input name="name" minLength={2} autoComplete="name" aria-invalid={!!fieldErrors.name} onChange={() => setFieldErrors(current => ({ ...current, name: "" }))} />{fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}</label><label className={fieldErrors.phone ? "field-invalid" : ""}>Telefone<input name="phone" type="tel" inputMode="numeric" placeholder="(00) 00000-0000" maxLength={15} autoComplete="tel" aria-invalid={!!fieldErrors.phone} onChange={event => { event.currentTarget.value = formatPhone(event.currentTarget.value); setFieldErrors(current => ({ ...current, phone: "" })); }} />{fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}</label></>}
      <label className={fieldErrors.email ? "field-invalid" : ""}>E-mail<input name="email" type="email" required autoComplete="email" aria-invalid={!!fieldErrors.email} onChange={() => setFieldErrors(current => ({ ...current, email: "" }))} />{fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}</label>
      <label className={fieldErrors.password ? "field-invalid" : ""}>Senha<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={!!fieldErrors.password} onChange={() => setFieldErrors(current => ({ ...current, password: "" }))} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></span>{fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}</label>
      {mode === "register" && <label className={fieldErrors.confirmPassword ? "field-invalid" : ""}>Confirmar senha<span className="password-field"><input name="confirmPassword" type={showConfirmation ? "text" : "password"} required minLength={8} autoComplete="new-password" aria-invalid={!!fieldErrors.confirmPassword} onChange={() => setFieldErrors(current => ({ ...current, confirmPassword: "" }))} /><button type="button" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}>{showConfirmation ? <EyeOff /> : <Eye />}</button></span>{fieldErrors.confirmPassword && <small className="field-error">{fieldErrors.confirmPassword}</small>}</label>}
      {error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}</button>
    </form><div className="auth-secure"><ShieldCheck /><span><b>Sessão protegida</b><small>Senha criptografada e cookie seguro.</small></span></div>
  </section></main>;
}
