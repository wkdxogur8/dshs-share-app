import { withApi, requireFetchHeader, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { purchaseMaterial } from "@/lib/materials";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    requireFetchHeader(req);
    const { id } = await ctx.params;
    const materialId = Number(id);
    if (!Number.isInteger(materialId)) throw new HttpError(400, "잘못된 요청입니다.");

    const user = await requireUser();
    const item = await purchaseMaterial(materialId, user);
    return Response.json({ item });
  });
}
