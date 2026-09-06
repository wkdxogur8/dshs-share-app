"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/browse");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="로그인"
      subtitle="학교 이메일로 로그인하세요."
      footer={
        <>
          아직 계정이 없나요?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="이메일">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="student@dshs.kr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="비밀번호" error={error ?? undefined}>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </AuthCard>
  );
}
