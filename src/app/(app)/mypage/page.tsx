"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge, Card, EmptyState } from "@/components/ui";
import { MaterialCard } from "@/components/material-card";
import { MaterialModal } from "@/components/material-modal";
import { formatDate, MATERIAL_STATUS_LABEL, POINT_REASON_LABEL } from "@/lib/format";
import type { MaterialSummary, PointTransaction, PublicUser, PurchaseRecord } from "@/lib/types";

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

type Tab = "purchases" | "uploads" | "points";

export default function MyPage() {
  const [tab, setTab] = useState<Tab>("purchases");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [uploads, setUploads] = useState<MaterialSummary[]>([]);
  const [points, setPoints] = useState<PointTransaction[]>([]);
  const [selected, setSelected] = useState<MaterialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ user: PublicUser }>("/api/me"),
      apiFetch<{ items: PurchaseRecord[] }>("/api/me/purchases"),
      apiFetch<{ items: MaterialSummary[] }>("/api/materials?mine=1"),
      apiFetch<{ items: PointTransaction[] }>("/api/me/points"),
    ])
      .then(([me, purchaseRes, uploadRes, pointRes]) => {
        setUser(me.user);
        setPurchases(purchaseRes.items);
        setUploads(uploadRes.items);
        setPoints(pointRes.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">마이페이지</h1>
        <p className="text-sm text-muted">내 포인트와 활동 내역을 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">보유 포인트</p>
          <p className="mt-1 text-2xl font-black text-brand">{(user?.points ?? 0).toLocaleString()}P</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">구매한 자료</p>
          <p className="mt-1 text-2xl font-black">{purchases.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">등록한 자료</p>
          <p className="mt-1 text-2xl font-black">{uploads.length}</p>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["purchases", "구매한 자료"],
            ["uploads", "등록한 자료"],
            ["points", "포인트 내역"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === key ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>
      ) : (
        <>
          {tab === "purchases" &&
            (purchases.length === 0 ? (
              <EmptyState title="아직 구매한 자료가 없어요" description="자료 둘러보기에서 원하는 자료를 찾아보세요." />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {purchases.map((p) => (
                  <MaterialCard key={p.id} material={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            ))}

          {tab === "uploads" &&
            (uploads.length === 0 ? (
              <EmptyState title="아직 등록한 자료가 없어요" />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/[.02] text-xs text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">제목</th>
                      <th className="px-4 py-3 font-medium">과목</th>
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 font-medium">등록일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {uploads.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium">{m.title}</td>
                        <td className="px-4 py-3 text-muted">{m.subject}</td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[m.status]}>{MATERIAL_STATUS_LABEL[m.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === "points" &&
            (points.length === 0 ? (
              <EmptyState title="포인트 내역이 없어요" />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/[.02] text-xs text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">내용</th>
                      <th className="px-4 py-3 font-medium">변동</th>
                      <th className="px-4 py-3 font-medium">일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {points.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium">
                          {POINT_REASON_LABEL[p.reason] ?? p.reason}
                          {p.memo && <span className="ml-1.5 text-xs text-muted">({p.memo})</span>}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${p.amount >= 0 ? "text-success" : "text-danger"}`}
                        >
                          {p.amount >= 0 ? "+" : ""}
                          {p.amount.toLocaleString()}P
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </>
      )}

      <MaterialModal
        material={selected}
        onClose={() => setSelected(null)}
        onUpdated={(item) => setSelected(item)}
      />
    </div>
  );
}
