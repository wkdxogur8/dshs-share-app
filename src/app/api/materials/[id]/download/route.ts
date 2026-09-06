import fs from "node:fs";
import { Readable } from "node:stream";
import { withApi, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getMaterialFileForDownload } from "@/lib/materials";
import { mimeFor } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await ctx.params;
    const materialId = Number(id);
    if (!Number.isInteger(materialId)) throw new HttpError(400, "잘못된 요청입니다.");

    const user = await requireUser();
    const { filePath, fileName } = await getMaterialFileForDownload(materialId, user);

    if (!fs.existsSync(filePath)) {
      throw new HttpError(404, "파일을 찾을 수 없습니다.");
    }

    const stat = fs.statSync(filePath);
    const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
    const encodedName = encodeURIComponent(fileName).replace(/'/g, "%27");

    return new Response(stream, {
      headers: {
        "Content-Type": mimeFor(fileName),
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
      },
    });
  });
}
