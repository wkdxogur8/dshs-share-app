import { withApi } from "@/lib/http";
import { requireUser, publicUser } from "@/lib/auth";

export async function GET() {
  return withApi(async () => {
    const user = await requireUser();
    return Response.json({ user: publicUser(user) });
  });
}
