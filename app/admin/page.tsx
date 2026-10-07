import { chatGPTSignInPath,chatGPTSignOutPath,getChatGPTUser } from "../chatgpt-auth";
import { ADMIN_EMAIL } from "./admin-auth";
import AdminDashboard from "./admin-dashboard";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await getChatGPTUser();if(!user)return <Access title="Entre para administrar" text="Use a conta administrativa autorizada para acessar estoque e pedidos." action={chatGPTSignInPath("/admin")} label="Entrar como administrador"/>;if(user.email.toLowerCase()!==ADMIN_EMAIL)return <Access title="Acesso não autorizado" text="Esta conta não possui permissão administrativa." action={chatGPTSignOutPath("/admin")} label="Trocar de conta"/>;return <AdminDashboard adminEmail={user.email}/>}
function Access({title,text,action,label}:{title:string;text:string;action:string;label:string}){return <main className="admin-access"><img src="/highparts-logo.png" alt="HighParts"/><div><small>PAINEL ADMINISTRATIVO</small><h1>{title}</h1><p>{text}</p><a href={action} target="_top">{label}</a><a className="admin-home" href="/">Voltar para a loja</a></div></main>}
