import { getCurrentUser } from "../auth";
import AdminDashboard from "./admin-dashboard";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) return <Access title="Entre para administrar" text="Use a conta administrativa autorizada para acessar estoque e pedidos." action="/entrar?returnTo=/admin" label="Entrar como administrador" />;
  if (user.role !== "admin") return <Access title="Acesso não autorizado" text="Sua conta é de cliente e não possui permissão administrativa." action="/conta" label="Voltar para minha conta" />;
  return <AdminDashboard adminEmail={user.email} />;
}
function Access({ title, text, action, label }: { title: string; text: string; action: string; label: string }) {
  return <main className="admin-access"><img src="/highparts-logo.png" alt="HighParts"/><div><small>PAINEL ADMINISTRATIVO</small><h1>{title}</h1><p>{text}</p><a href={action}>{label}</a><a className="admin-home" href="/">Voltar para a loja</a></div></main>;
}
