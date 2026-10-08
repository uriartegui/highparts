import { getCurrentUser } from "../../auth";
import SecurityDashboard from "./security-dashboard";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getCurrentUser();if(!user||user.role!=="admin")return <main className="admin-access"><div><small>SEGURANÇA</small><h1>Acesso restrito.</h1><p>Entre com a conta administrativa.</p><a href="/entrar?returnTo=/admin/seguranca">Entrar</a></div></main>;return <SecurityDashboard/>}
