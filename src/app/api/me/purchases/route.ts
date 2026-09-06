import { withApi } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { myPurchases } from "@/lib/materials";

export async function GET() {
  return withApi(async () => {
    const user = await requireUser();
    const items = await myPurchases(user);
    return Response.json({ items });
  });
}
