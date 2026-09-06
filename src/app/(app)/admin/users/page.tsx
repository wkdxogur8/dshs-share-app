"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { AdminUserRow, Role, UserStatus } from "@/lib/types";

export default function AdminUsersPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState<AdminUserRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(q: string) {
    setLoading(true);
    const params = q ? `?query=${encodeURIComponent(q)}` : "";
    apiFetch<{ items: AdminUserRow[] }>(`/api/admin/users${params}`)
      .then((res) => setUsers(res.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <Input
        placeholder="이름 또는 이메일로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>
      ) : users.length === 0 ? (
        <EmptyState title="검색 결과가 없어요" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[.02] text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">권한</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">포인트</th>
                <th className="px-4 py-3 font-medium">공유</th>
                <th className="px-4 py-3 font-medium">구매</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                      {u.role === "admin" ? "관리자" : "학생"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "active" ? "success" : "danger"}>
                      {u.status === "active" ? "활성" : "정지"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{u.points.toLocaleString()}P</td>
                  <td className="px-4 py-3 text-muted">{u.sharedCount}</td>
                  <td className="px-4 py-3 text-muted">{u.purchaseCount}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => setManaging(u)} className="!px-3 !py-1.5 text-xs">
                      관리
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ManageUserModal
        user={managing}
        onClose={() => setManaging(null)}
        onSaved={() => {
          setManaging(null);
          load(query);
          toast("회원 정보를 업데이트했어요.", "success");
        }}
      />
    </div>
  );
}

function ManageUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [pointsDelta, setPointsDelta] = useState("");
  const [memo, setMemo] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [status, setStatus] = useState<UserStatus>("active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 관리 대상 회원이 바뀔 때 입력값 초기화
      setPointsDelta("");
      setMemo("");
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          pointsDelta: pointsDelta ? Number(pointsDelta) : undefined,
          memo: memo || undefined,
          role,
          status,
        }),
      });
      onSaved();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "업데이트에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!user} onClose={onClose} title={user ? `${user.name} 관리` : ""}>
      <div className="space-y-4">
        <Field label="포인트 증감" hint="음수를 입력하면 차감됩니다. 0 미만으로는 내려가지 않아요.">
          <Input
            type="number"
            placeholder="예: 50 또는 -50"
            value={pointsDelta}
            onChange={(e) => setPointsDelta(e.target.value)}
          />
        </Field>
        <Field label="메모 (선택)">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="포인트 조정 사유" />
        </Field>
        <Field label="권한">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="student">학생</option>
            <option value="admin">관리자</option>
          </Select>
        </Field>
        <Field label="계정 상태">
          <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
          </Select>
        </Field>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Modal>
  );
}
