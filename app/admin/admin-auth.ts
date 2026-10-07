import { getChatGPTUser } from "../chatgpt-auth";
export const ADMIN_EMAIL = "alisson@highparts.com.br";
export async function getAdmin(){const user=await getChatGPTUser();return user?.email.toLowerCase()===ADMIN_EMAIL?user:null}
