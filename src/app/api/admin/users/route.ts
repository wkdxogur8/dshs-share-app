import { withApi } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { adminListUsers } from "@/lib/admin";

export async function GET(req: Request) {
  return withApi(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || undefined;
    const items = await adminListUsers(query);
    return Response.json({ items });
  });
}
