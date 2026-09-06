import { withApi } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getAdminStats } from "@/lib/admin";

export async function GET() {
  return withApi(async () => {
    await requireAdmin();
    return Response.json(await getAdminStats());
  });
}
