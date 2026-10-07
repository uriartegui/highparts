import { getCurrentUser } from "../auth";
import AccountDashboard from "./account-dashboard";
export const dynamic="force-dynamic";
export default async function AccountPage(){const user=await getCurrentUser();if(!user)return <main className="account-guest"><img src="/highparts-logo.png" alt="HighParts"/><h1>Entre na sua conta</h1><p>Acesse seus veículos, carrinho e histórico de compras.</p><a href="/entrar?returnTo=/conta">Entrar ou criar conta</a></main>;return <AccountDashboard user={user}/>}
