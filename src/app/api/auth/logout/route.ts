import { withApi, requireFetchHeader } from "@/lib/http";
import { destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  return withApi(async () => {
    requireFetchHeader(req);
    await destroySession();
    return Response.json({ ok: true });
  });
}
