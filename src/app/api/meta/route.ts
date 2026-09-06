import { withApi } from "@/lib/http";
import { getMeta } from "@/lib/materials";

export async function GET() {
  return withApi(async () => {
    return Response.json(await getMeta());
  });
}
