import { withApi, requireFetchHeader, HttpError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isAllowedEmailDomain, isAdminEmail, hashPassword, createSession, publicUser } from "@/lib/auth";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  return withApi(async () => {
    requireFetchHeader(req);
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !name || !password) {
      throw new HttpError(400, "이메일, 이름, 비밀번호를 모두 입력해주세요.");
    }
    if (!isAllowedEmailDomain(email)) {
      throw new HttpError(
        400,
        `학교 이메일(${config.allowedEmailDomains.map((d) => `@${d}`).join(", ")})로만 가입할 수 있습니다.`
      );
    }
    if (password.length < 8 || password.length > 100) {
      throw new HttpError(400, "비밀번호는 8자 이상 100자 이하로 입력해주세요.");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "이미 가입된 이메일입니다.");

    const { hash, salt } = hashPassword(password);
    const role = isAdminEmail(email) ? "admin" : "student";

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          passwordHash: hash,
          passwordSalt: salt,
          role,
          points: config.signupBonusPoints,
        },
      });
      await tx.pointTransaction.create({
        data: { userId: created.id, amount: config.signupBonusPoints, reason: "signup_bonus" },
      });
      return created;
    });

    await createSession(user.id);

    return Response.json({ user: publicUser(user) }, { status: 201 });
  });
}
