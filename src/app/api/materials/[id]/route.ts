import { withApi, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getMaterialForUser } from "@/lib/materials";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await ctx.params;
    const materialId = Number(id);
    if (!Number.isInteger(materialId)) throw new HttpError(400, "잘못된 요청입니다.");

    const currentUser = await requireUser();
    const item = await getMaterialForUser(materialId, currentUser);
    return Response.json({ item });
  });
}
