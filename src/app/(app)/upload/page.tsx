"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { formatDate, MATERIAL_STATUS_LABEL } from "@/lib/format";
import type { MaterialSummary, MetaResponse } from "@/lib/types";

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default function UploadPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [academies, setAcademies] = useState<string[]>([]);
  const [mine, setMine] = useState<MaterialSummary[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [unitCount, setUnitCount] = useState("");
  const [sourceAcademy, setSourceAcademy] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadMine() {
    setLoadingMine(true);
    apiFetch<{ items: MaterialSummary[] }>("/api/materials?mine=1")
      .then((res) => setMine(res.items))
      .finally(() => setLoadingMine(false));
  }

  useEffect(() => {
    apiFetch<MetaResponse>("/api/meta").then((meta) => {
      setSubjects(meta.subjects);
      setAcademies(meta.academies);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 진입 시 내 자료 목록 로드
    loadMine();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("파일을 첨부해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("subject", subject);
      form.set("unitCount", unitCount);
      form.set("sourceAcademy", sourceAcademy);
      form.set("description", description);
      form.set("file", file);

      const res = await apiFetch<{ suggested: number }>("/api/materials", {
        method: "POST",
        body: form,
      });

      toast(`자료가 등록되었어요. 관리자 승인 후 공개됩니다. (추천 포인트: ${res.suggested}P)`, "success");
      setTitle("");
      setSubject("");
      setUnitCount("");
      setSourceAcademy("");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadMine();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">자료 등록</h1>
        <p className="text-sm text-muted">자료를 등록하면 관리자 승인 후 포인트를 지급받고 공개됩니다.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="제목">
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="과목">
              <Select required value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="" disabled>
                  과목 선택
                </option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="단원 수">
              <Input
                type="number"
                required
                min={1}
                max={50}
                value={unitCount}
                onChange={(e) => setUnitCount(e.target.value)}
              />
            </Field>
            <Field label="출처 학원">
              <Input
                required
                list="academy-options-upload"
                value={sourceAcademy}
                onChange={(e) => setSourceAcademy(e.target.value)}
              />
              <datalist id="academy-options-upload">
                {academies.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="자료 설명" hint="자료의 구성과 특징을 자세히 적을수록 더 많은 포인트를 받을 수 있어요.">
            <Textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field
            label="파일"
            hint="PDF, HWP(X), DOC(X), PPT(X), XLS(X), PNG, JPG, ZIP · 최대 20MB"
            error={error ?? undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-dashed border-border bg-surface px-3 py-4 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
            />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? "등록 중..." : "자료 등록하기"}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold">내가 등록한 자료</h2>
        {loadingMine ? (
          <p className="py-8 text-center text-sm text-muted">불러오는 중...</p>
        ) : mine.length === 0 ? (
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
                {mine.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">
                      {m.title}
                      {m.status === "rejected" && m.rejectReason && (
                        <p className="mt-0.5 text-xs text-danger">사유: {m.rejectReason}</p>
                      )}
                    </td>
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
        )}
      </div>
    </div>
  );
}
