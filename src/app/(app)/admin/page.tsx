"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { MaterialAdmin } from "@/lib/types";

type Stats = {
  userCount: number;
  studentCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  purchaseCount: number;
  totalPoints: number;
  pointsSpent: number;
};

const STAT_CARDS: { key: keyof Stats; label: string; suffix?: string }[] = [
  { key: "userCount", label: "전체 회원" },
  { key: "studentCount", label: "학생 회원" },
  { key: "pendingCount", label: "승인 대기 자료" },
  { key: "approvedCount", label: "공개중 자료" },
  { key: "rejectedCount", label: "반려된 자료" },
  { key: "purchaseCount", label: "총 구매 건수" },
  { key: "totalPoints", label: "유통중 포인트", suffix: "P" },
  { key: "pointsSpent", label: "누적 사용 포인트", suffix: "P" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<MaterialAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<{ items: MaterialAdmin[] }>("/api/admin/materials?status=pending"),
    ])
      .then(([statsRes, materialsRes]) => {
        setStats(statsRes);
        setPending(materialsRes.items.slice(0, 8));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map(({ key, label, suffix }) => (
          <Card key={key} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-black">
              {(stats?.[key] ?? 0).toLocaleString()}
              {suffix ?? ""}
            </p>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">승인 대기 자료</h2>
          <Link href="/admin/materials?status=pending" className="text-sm font-semibold text-brand hover:underline">
            전체 보기 →
          </Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState title="승인을 기다리는 자료가 없어요" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/[.02] text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium">과목</th>
                  <th className="px-4 py-3 font-medium">등록자</th>
                  <th className="px-4 py-3 font-medium">등록일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.title}</td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">{m.subject}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{m.uploaderName}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
