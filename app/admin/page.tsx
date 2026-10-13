import { LockKeyhole, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "../auth";
import SiteShell from "../site-shell";
import { StatePanel } from "../ui";
import AdminDashboard from "./admin-dashboard";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <SiteShell>
        <StatePanel icon={<LockKeyhole />} eyebrow="PAINEL ADMINISTRATIVO" title="Entre para administrar." text="Use a conta administrativa autorizada para acessar estoque e pedidos."
          actions={[{ href: "/entrar?returnTo=/admin", label: "Entrar como administrador" }, { href: "/", label: "Voltar para a loja", variant: "ghost" }]} />
      </SiteShell>
    );
  if (user.role !== "admin")
    return (
      <SiteShell>
        <StatePanel icon={<ShieldAlert />} tone="warning" eyebrow="PAINEL ADMINISTRATIVO" title="Acesso não autorizado." text="Sua conta é de cliente e não possui permissão administrativa."
          actions={[{ href: "/conta", label: "Ir para minha conta", variant: "dark" }, { href: "/", label: "Voltar para a loja", variant: "ghost" }]} />
      </SiteShell>
    );
  return <AdminDashboard adminEmail={user.email} />;
}
