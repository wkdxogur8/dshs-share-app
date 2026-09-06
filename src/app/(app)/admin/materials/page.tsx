"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { Modal } from "@/components/modal";
import { Badge, Button, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { formatBytes, formatDate, MATERIAL_STATUS_LABEL } from "@/lib/format";
import { suggestedPoints } from "@/lib/points";
import type { MaterialAdmin } from "@/lib/types";

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "공개중" },
  { key: "rejected", label: "반려됨" },
  { key: "all", label: "전체" },
];

function AdminMaterialsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialStatus = searchParams.get("status") ?? "pending";
  const [status, setStatus] = useState(initialStatus);
  const [materials, setMaterials] = useState<MaterialAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<MaterialAdmin | null>(null);
  const [rejecting, setRejecting] = useState<MaterialAdmin | null>(null);

  function load(currentStatus: string) {
    setLoading(true);
    apiFetch<{ items: MaterialAdmin[] }>(`/api/admin/materials?status=${currentStatus}`)
      .then((res) => setMaterials(res.items))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 상태 탭 전환 시 목록을 다시 불러온다
    load(status);
    router.replace(`/admin/materials?status=${status}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl bg-black/[.03] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              status === tab.key ? "bg-surface shadow-sm text-brand" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>
      ) : materials.length === 0 ? (
        <EmptyState title="해당 상태의 자료가 없어요" />
      ) : (
        <div className="space-y-4">
          {materials.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="brand">{m.subject}</Badge>
                    <Badge tone={STATUS_TONE[m.status]}>{MATERIAL_STATUS_LABEL[m.status]}</Badge>
                  </div>
                  <h3 className="font-bold">{m.title}</h3>
                  <p className="text-xs text-muted">
                    {m.uploaderName} ({m.uploaderEmail}) · {m.sourceAcademy} · {m.unitCount}단원 · {formatDate(m.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/materials/${m.id}/download`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-black/[.03] hover:text-foreground"
                  >
                    원본 파일 확인
                  </a>
                  {m.status === "pending" && (
                    <>
                      <Button variant="secondary" onClick={() => setRejecting(m)} className="!px-3 !py-1.5 text-xs">
                        반려
                      </Button>
                      <Button onClick={() => setApproving(m)} className="!px-3 !py-1.5 text-xs">
                        승인
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/[.02] p-3 text-sm text-foreground">
                {m.description}
              </p>
              <p className="mt-2 text-xs text-muted">
                {m.fileName} · {formatBytes(m.fileSize)}
                {m.status === "approved" && ` · 열람가 ${m.pointCost}P · 등록자 보상 ${m.rewardPoints}P`}
                {m.status === "rejected" && m.rejectReason && ` · 반려 사유: ${m.rejectReason}`}
              </p>
            </div>
          ))}
        </div>
      )}

      <ApproveModal
        material={approving}
        onClose={() => setApproving(null)}
        onApproved={() => {
          setApproving(null);
          load(status);
          toast("자료를 승인했어요.", "success");
        }}
      />
      <RejectModal
        material={rejecting}
        onClose={() => setRejecting(null)}
        onRejected={() => {
          setRejecting(null);
          load(status);
          toast("자료를 반려했어요.", "success");
        }}
      />
    </div>
  );
}

function ApproveModal({
  material,
  onClose,
  onApproved,
}: {
  material: MaterialAdmin | null;
  onClose: () => void;
  onApproved: () => void;
}) {
  const toast = useToast();
  const [pointCost, setPointCost] = useState("");
  const [rewardPoints, setRewardPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (material) {
      const suggested = suggestedPoints(material.unitCount, material.description.length);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 모달이 열릴 자료가 바뀔 때 입력값을 추천값으로 리셋
      setPointCost(String(suggested));
      setRewardPoints(String(suggested));
    }
  }, [material]);

  async function handleSubmit() {
    if (!material) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/admin/materials/${material.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ pointCost: Number(pointCost), rewardPoints: Number(rewardPoints) }),
      });
      onApproved();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "승인에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!material} onClose={onClose} title="자료 승인">
      <div className="space-y-4">
        <Field label="열람에 필요한 포인트 (구매가)">
          <Input type="number" min={0} value={pointCost} onChange={(e) => setPointCost(e.target.value)} />
        </Field>
        <Field label="등록자에게 지급할 보상 포인트">
          <Input type="number" min={0} value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">추천값은 단원 수와 설명 길이를 참고해 자동 계산되었어요. 자유롭게 수정할 수 있습니다.</p>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? "처리 중..." : "승인 확정"}
        </Button>
      </div>
    </Modal>
  );
}

function RejectModal({
  material,
  onClose,
  onRejected,
}: {
  material: MaterialAdmin | null;
  onClose: () => void;
  onRejected: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 모달이 열릴 자료가 바뀔 때 입력값 초기화
    setReason("");
  }, [material]);

  async function handleSubmit() {
    if (!material) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/admin/materials/${material.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      onRejected();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "반려에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!material} onClose={onClose} title="자료 반려">
      <div className="space-y-4">
        <Field label="반려 사유">
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button variant="danger" onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? "처리 중..." : "반려 확정"}
        </Button>
      </div>
    </Modal>
  );
}

export default function AdminMaterialsPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-muted">불러오는 중...</p>}>
      <AdminMaterialsInner />
    </Suspense>
  );
}
