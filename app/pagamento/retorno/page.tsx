"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PaymentReturnContent() {
  const params = useSearchParams();
  const result = params.get("resultado") || "pendente";
  const order = params.get("pedido") || "";
  const content =
    result === "sucesso"
      ? {
          icon: <CheckCircle2 />,
          eyebrow: "PAGAMENTO RECEBIDO",
          title: "Estamos confirmando seu pagamento.",
          text: "A confirmação é feita diretamente pelo Mercado Pago. O status será atualizado automaticamente em seus pedidos.",
        }
      : result === "falha"
        ? {
            icon: <XCircle />,
            eyebrow: "PAGAMENTO NÃO CONCLUÍDO",
            title: "Sua compra continua reservada.",
            text: "Você pode voltar ao pedido e tentar novamente com outro meio de pagamento.",
          }
        : {
            icon: <Clock3 />,
            eyebrow: "PAGAMENTO PENDENTE",
            title: "Aguardando a confirmação.",
            text: "Alguns meios de pagamento podem levar alguns minutos para serem confirmados.",
          };
  return (
    <main className="payment-return-page">
      <section>
        <i>{content.icon}</i>
        <small>{content.eyebrow}</small>
        <h1>{content.title}</h1>
        <p>{content.text}</p>
        {order && <b>Pedido #{order}</b>}
        <div>
          <a href="/conta#orders">Acompanhar pedido</a>
          <a href="/">Voltar à loja</a>
        </div>
      </section>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentReturnContent />
    </Suspense>
  );
}
