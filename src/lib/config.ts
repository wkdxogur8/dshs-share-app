function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value || !value.trim()) return fallback;
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const config = {
  allowedEmailDomains: parseList(process.env.ALLOWED_EMAIL_DOMAINS, ["dshs.kr"]),
  adminEmails: parseList(process.env.ADMIN_EMAILS, []),
  signupBonusPoints: Number(process.env.SIGNUP_BONUS_POINTS ?? 300),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024,
  sessionCookieName: "dshs_session",
  sessionTtlDays: 30,
  trustProxyHttps: process.env.TRUST_PROXY_HTTPS === "true",
};
