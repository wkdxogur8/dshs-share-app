import { withApi } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { adminListMaterials } from "@/lib/admin";

export async function GET(req: Request) {
  return withApi(async () => {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const items = await adminListMaterials(status);
    return Response.json({ items });
  });
}
