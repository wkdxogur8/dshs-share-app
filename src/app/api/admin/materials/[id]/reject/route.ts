import { withApi, requireFetchHeader, HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { adminRejectMaterial } from "@/lib/admin";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    requireFetchHeader(req);
    await requireAdmin();
    const { id } = await ctx.params;
    const materialId = Number(id);
    if (!Number.isInteger(materialId)) throw new HttpError(400, "잘못된 요청입니다.");

    const body = await req.json().catch(() => null);
    const item = await adminRejectMaterial(materialId, String(body?.reason ?? ""));
    return Response.json({ item });
  });
}
