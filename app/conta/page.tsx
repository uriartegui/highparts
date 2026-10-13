import { CircleUserRound } from "lucide-react";
import { getCurrentUser } from "../auth";
import SiteShell from "../site-shell";
import { StatePanel } from "../ui";
import AccountDashboard from "./account-dashboard";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user)
    return (
      <SiteShell>
        <StatePanel icon={<CircleUserRound />} eyebrow="MINHA CONTA" title="Entre na sua conta." text="Acesse seus veículos, endereços, carrinho e o histórico de pedidos."
          actions={[{ href: "/entrar?returnTo=/conta", label: "Entrar ou criar conta" }, { href: "/catalogo", label: "Explorar catálogo", variant: "ghost" }]} />
      </SiteShell>
    );
  return <AccountDashboard user={user} />;
}
