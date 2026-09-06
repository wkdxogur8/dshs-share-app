import { withApi, requireFetchHeader, HttpError } from "@/lib/http";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { listMaterials, createMaterial } from "@/lib/materials";

export async function GET(req: Request) {
  return withApi(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new HttpError(401, "로그인이 필요합니다.");

    const url = new URL(req.url);
    const subject = url.searchParams.get("subject") || undefined;
    const academy = url.searchParams.get("academy") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const mine = url.searchParams.get("mine") === "1";
    const minUnitRaw = url.searchParams.get("minUnit");
    const maxUnitRaw = url.searchParams.get("maxUnit");

    const items = await listMaterials({
      currentUser,
      subject,
      academy,
      q,
      mine,
      minUnit: minUnitRaw ? Number(minUnitRaw) : undefined,
      maxUnit: maxUnitRaw ? Number(maxUnitRaw) : undefined,
    });

    return Response.json({ items });
  });
}

export async function POST(req: Request) {
  return withApi(async () => {
    requireFetchHeader(req);
    const uploader = await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "파일을 첨부해주세요.");
    }

    const result = await createMaterial({
      uploader,
      title: String(form.get("title") ?? ""),
      subject: String(form.get("subject") ?? ""),
      unitCount: Number(form.get("unitCount")),
      sourceAcademy: String(form.get("sourceAcademy") ?? ""),
      description: String(form.get("description") ?? ""),
      file,
    });

    return Response.json(result, { status: 201 });
  });
}
