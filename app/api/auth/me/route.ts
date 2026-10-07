import { getCurrentUser } from "../../../auth";
export async function GET() { return Response.json({ user: await getCurrentUser() }); }
