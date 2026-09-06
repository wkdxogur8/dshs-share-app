"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api-client";

export function SignupForm() {
  const router = useRouter();
  const [domains, setDomains] = useState<string[]>(["dshs.kr"]);
  const [bonusPoints, setBonusPoints] = useState(300);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ allowedEmailDomains: string[]; signupBonusPoints: number }>("/api/meta")
      .then((meta) => {
        setDomains(meta.allowedEmailDomains);
        setBonusPoints(meta.signupBonusPoints);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      });
      router.push("/browse");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
      setLoading(false);
    }
  }

  const domainHint = domains.map((d) => `@${d}`).join(", ");

  return (
    <AuthCard
      title="회원가입"
      subtitle={`학교 이메일(${domainHint})로만 가입할 수 있습니다.`}
      footer={
        <>
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="이메일" hint={`예: student@${domains[0] ?? "dshs.kr"}`}>
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder={`student@${domains[0] ?? "dshs.kr"}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="이름">
          <Input
            required
            autoComplete="name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="비밀번호" hint="8자 이상 100자 이하" error={error ?? undefined}>
          <Input
            type="password"
            required
            minLength={8}
            maxLength={100}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "가입 처리 중..." : `회원가입하고 ${bonusPoints}P 받기`}
        </Button>
      </form>
    </AuthCard>
  );
}
