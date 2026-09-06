"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/toast";

type HeaderUser = {
  name: string;
  email: string;
  role: string;
  points: number;
};

const NAV_ITEMS = [
  { href: "/browse", label: "자료 둘러보기" },
  { href: "/upload", label: "자료 등록" },
  { href: "/mypage", label: "마이페이지" },
];

export function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast("로그아웃에 실패했습니다.", "error");
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/browse" className="flex items-center gap-2 font-black text-lg tracking-tight text-brand">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white">
            대신
          </span>
          <span className="hidden sm:inline">1-4반 내신 자료</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand-soft text-brand" : "text-muted hover:bg-black/[.03] hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {user.role === "admin" && (
            <Link
              href="/admin"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname?.startsWith("/admin")
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:bg-black/[.03] hover:text-foreground"
              }`}
            >
              관리자
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-warning-soft px-3 py-1.5 text-sm font-bold text-warning sm:inline-flex items-center gap-1">
            ✨ {user.points.toLocaleString()}P
          </span>
          <div className="hidden text-right leading-tight md:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/[.03] hover:text-foreground disabled:opacity-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
