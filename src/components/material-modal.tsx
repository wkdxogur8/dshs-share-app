"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Button } from "@/components/ui";
import { formatBytes, formatDate } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import type { MaterialSummary } from "@/lib/types";

export function MaterialModal({
  material,
  onClose,
  onUpdated,
}: {
  material: MaterialSummary | null;
  onClose: () => void;
  onUpdated: (item: MaterialSummary) => void;
}) {
  const toast = useToast();
  const [purchasing, setPurchasing] = useState(false);

  async function handlePurchase() {
    if (!material) return;
    setPurchasing(true);
    try {
      const { item } = await apiFetch<{ item: MaterialSummary }>(
        `/api/materials/${material.id}/purchase`,
        { method: "POST" }
      );
      onUpdated(item);
      toast("자료를 열람할 수 있게 되었어요.", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "구매에 실패했습니다.", "error");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <Modal open={!!material} onClose={onClose} title={material?.title ?? ""} wide>
      {material && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{material.subject}</Badge>
            <Badge>{material.sourceAcademy}</Badge>
            <Badge>{material.unitCount}단원</Badge>
            <Badge tone={material.unlocked ? "success" : "warning"}>
              {material.unlocked ? "열람 가능" : `${material.pointCost ?? 0}P 필요`}
            </Badge>
          </div>

          {material.unlocked ? (
            <>
              <p className="whitespace-pre-wrap rounded-xl bg-black/[.02] p-4 text-sm leading-relaxed text-foreground">
                {material.description}
              </p>
              <div className="flex items-center justify-between rounded-xl border border-border p-4 text-sm">
                <div>
                  <p className="font-medium">{material.fileName}</p>
                  <p className="text-xs text-muted">{formatBytes(material.fileSize ?? 0)}</p>
                </div>
                <a
                  href={`/api/materials/${material.id}/download`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  다운로드
                </a>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted">자료 설명과 파일은 열람 후 확인할 수 있어요.</p>
              <Button onClick={handlePurchase} disabled={purchasing} className="mt-4">
                {purchasing ? "처리 중..." : `${material.pointCost ?? 0}P로 열람하기`}
              </Button>
            </div>
          )}

          <p className="text-right text-xs text-muted">등록일 {formatDate(material.createdAt)}</p>
        </div>
      )}
    </Modal>
  );
}
