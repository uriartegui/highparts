"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SiteShell from "../../site-shell";
import { StatePanel } from "../../ui";

function PaymentReturnContent() {
  const params = useSearchParams();
  const result = params.get("resultado") || "pendente";
  const order = params.get("pedido") || "";
  const content =
    result === "sucesso"
      ? {
          icon: <CheckCircle2 />,
          tone: "success" as const,
          eyebrow: "PAGAMENTO RECEBIDO",
          title: "Estamos confirmando seu pagamento.",
          text: "A confirmação é feita diretamente pelo Mercado Pago. O status será atualizado automaticamente em seus pedidos.",
        }
      : result === "falha"
        ? {
            icon: <XCircle />,
            tone: "danger" as const,
            eyebrow: "PAGAMENTO NÃO CONCLUÍDO",
            title: "Sua compra continua reservada.",
            text: "Você pode voltar ao pedido e tentar novamente com outro meio de pagamento.",
          }
        : {
            icon: <Clock3 />,
            tone: "warning" as const,
            eyebrow: "PAGAMENTO PENDENTE",
            title: "Aguardando a confirmação.",
            text: "Alguns meios de pagamento podem levar alguns minutos para serem confirmados.",
          };
  return (
    <StatePanel icon={content.icon} tone={content.tone} eyebrow={content.eyebrow} title={content.title} text={content.text}
      actions={[{ href: "/conta#orders", label: "Acompanhar pedido", variant: "dark" }, { href: "/", label: "Voltar à loja", variant: "ghost" }]}>
      {order && <span className="hp-meta">Pedido #{order}</span>}
    </StatePanel>
  );
}

export default function PaymentReturnPage() {
  return (
    <SiteShell>
      <Suspense fallback={null}>
        <PaymentReturnContent />
      </Suspense>
    </SiteShell>
  );
}
