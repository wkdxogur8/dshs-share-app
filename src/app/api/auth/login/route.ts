import { withApi, requireFetchHeader, getClientIp, HttpError } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  publicUser,
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "@/lib/auth";

export async function POST(req: Request) {
  return withApi(async () => {
    requireFetchHeader(req);
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      throw new HttpError(400, "이메일과 비밀번호를 입력해주세요.");
    }

    const rateKey = `${getClientIp(req)}:${email}`;
    checkLoginRateLimit(rateKey);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    if (user.status !== "active") {
      throw new HttpError(403, "정지된 계정입니다. 담임 선생님께 문의해주세요.");
    }

    resetLoginRateLimit(rateKey);
    await createSession(user.id);

    return Response.json({ user: publicUser(user) });
  });
}
