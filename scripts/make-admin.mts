// 사용법: npm run make-admin -- <이메일>
// 이미 가입된 계정을 관리자 권한으로 승격합니다. 배포 환경의 콘솔/쉘에서 실행하세요.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("사용법: npm run make-admin -- <이메일>");
  process.exit(1);
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./data/dshs-share.db",
});
const prisma = new PrismaClient({ adapter });

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`가입된 계정을 찾을 수 없습니다: ${email}`);
  process.exit(1);
}

await prisma.user.update({ where: { email }, data: { role: "admin" } });
console.log(`${email} 계정을 관리자로 승격했습니다.`);
await prisma.$disconnect();
