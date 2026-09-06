import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { HttpError } from "@/lib/http";
import type { User } from "@/generated/prisma/client";

const EMAIL_RE = /^[^\s@]+@([^\s@]+)$/;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

export function isAllowedEmailDomain(email: string) {
  const match = EMAIL_RE.exec(email);
  if (!match) return false;
  return config.allowedEmailDomains.includes(match[1].toLowerCase());
}

export function isAdminEmail(email: string) {
  return config.adminEmails.includes(email.toLowerCase());
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: token, userId, expiresAt } });

  const store = await cookies();
  store.set(config.sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: config.trustProxyHttps,
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(config.sessionCookieName)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: token } }).catch(() => {});
  }
  store.delete(config.sessionCookieName);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(config.sessionCookieName)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "active") return null;

  return session.user;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    points: user.points,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "관리자만 접근할 수 있습니다.");
  return user;
}

export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

// ---------- 로그인 시도 제한 (메모리 기반, 학급 규모엔 충분) ----------
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; firstAttempt: number }>();

export function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    throw new HttpError(429, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
  }
}

export function resetLoginRateLimit(key: string) {
  attempts.delete(key);
}
