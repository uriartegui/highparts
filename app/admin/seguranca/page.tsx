import { LockKeyhole } from "lucide-react";
import { getCurrentUser } from "../../auth";
import SiteShell from "../../site-shell";
import { StatePanel } from "../../ui";
import SecurityDashboard from "./security-dashboard";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return (
      <SiteShell>
        <StatePanel icon={<LockKeyhole />} eyebrow="SEGURANÇA" title="Acesso restrito." text="Entre com a conta administrativa para ver os eventos de segurança."
          actions={[{ href: "/entrar?returnTo=/admin/seguranca", label: "Entrar" }, { href: "/", label: "Voltar para a loja", variant: "ghost" }]} />
      </SiteShell>
    );
  return <SecurityDashboard />;
}
