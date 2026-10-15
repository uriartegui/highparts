"use client";
import { LoaderCircle, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Option = { id: string; carrier: string; service: string; priceCents: number; deliveryDays: number; logo: string | null };
const CEP_KEY = "highparts_cep";

const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const maskCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

// Freight estimate by CEP for product and cart pages. The final price is
// always recalculated on the server when the order is created.
export default function ShippingEstimator({ items, title = "Calcular frete e prazo" }: { items: Array<{ code: string; quantity: number }>; title?: string }) {
  const [cep, setCep] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const itemsKey = JSON.stringify(items);

  const calculate = useCallback(async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("Informe um CEP com 8 dígitos.");
      setOptions([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postalCode: digits, items: JSON.parse(itemsKey) }),
      });
      const data = (await response.json().catch(() => ({}))) as { options?: Option[]; error?: string };
      if (!response.ok || !data.options?.length) {
        setOptions([]);
        setError(data.error || "Não foi possível calcular o frete para este CEP.");
        return;
      }
      setOptions(data.options);
      try { localStorage.setItem(CEP_KEY, digits); } catch {}
    } catch {
      setOptions([]);
      setError("Não foi possível calcular o frete agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [itemsKey]);

  // Reuse the CEP the visitor already used on this browser.
  useEffect(() => {
    let saved = "";
    try { saved = localStorage.getItem(CEP_KEY) || ""; } catch {}
    if (saved.length === 8) {
      setCep(maskCep(saved));
      void calculate(saved);
    }
  }, [calculate]);

  const cheapest = options[0]?.id;
  const fastest = options.length > 1 ? [...options].sort((a, b) => a.deliveryDays - b.deliveryDays || a.priceCents - b.priceCents)[0].id : "";

  return (
    <div className="hp-shipping-estimator">
      <div className="hp-shipping-head">
        <Truck />
        <b>{title}</b>
      </div>
      <form className="hp-shipping-form" onSubmit={(event) => { event.preventDefault(); void calculate(cep); }}>
        <input value={cep} onChange={(event) => setCep(maskCep(event.target.value))} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" aria-label="CEP de entrega" maxLength={9} />
        <button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : "Calcular"}</button>
      </form>
      <a className="hp-shipping-cep-help" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer">Não sei meu CEP</a>
      {error && <p className="hp-shipping-error" role="alert">{error}</p>}
      {options.length > 0 && (
        <ul className="hp-shipping-list" aria-live="polite">
          {options.map((option) => (
            <li key={option.id}>
              {option.logo ? <img src={option.logo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : <span className="hp-shipping-logo" />}
              <span>
                <b>
                  {option.carrier} · {option.service}
                  {option.id === cheapest && <em className="tag cheap">Mais barato</em>}
                  {option.id === fastest && option.id !== cheapest && <em className="tag fast">Mais rápido</em>}
                </b>
                <small>Até {option.deliveryDays} {option.deliveryDays === 1 ? "dia útil" : "dias úteis"} após a confirmação do pagamento</small>
              </span>
              <strong>{money(option.priceCents)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
