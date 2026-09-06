import { withApi, requireFetchHeader, HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { adminGetUser, adminUpdateUser } from "@/lib/admin";
import { publicUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) throw new HttpError(400, "잘못된 요청입니다.");
    return Response.json(await adminGetUser(userId));
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    requireFetchHeader(req);
    await requireAdmin();
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) throw new HttpError(400, "잘못된 요청입니다.");

    const body = await req.json().catch(() => null);
    const updated = await adminUpdateUser(userId, {
      pointsDelta: body?.pointsDelta != null ? Number(body.pointsDelta) : undefined,
      memo: body?.memo != null ? String(body.memo) : undefined,
      role: body?.role != null ? String(body.role) : undefined,
      status: body?.status != null ? String(body.status) : undefined,
    });

    return Response.json({ user: publicUser(updated) });
  });
}
