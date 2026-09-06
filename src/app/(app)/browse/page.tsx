"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { EmptyState, Input, Select } from "@/components/ui";
import { MaterialCard } from "@/components/material-card";
import { MaterialModal } from "@/components/material-modal";
import type { MaterialSummary, MetaResponse } from "@/lib/types";

export default function BrowsePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [academies, setAcademies] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MaterialSummary | null>(null);

  const [subject, setSubject] = useState("");
  const [academy, setAcademy] = useState("");
  const [minUnit, setMinUnit] = useState("");
  const [maxUnit, setMaxUnit] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    apiFetch<MetaResponse>("/api/meta").then((meta) => {
      setSubjects(meta.subjects);
      setAcademies(meta.academies);
    });
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 필터가 바뀌면 로딩 상태로 전환
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (academy) params.set("academy", academy);
      if (minUnit) params.set("minUnit", minUnit);
      if (maxUnit) params.set("maxUnit", maxUnit);
      if (q) params.set("q", q);

      apiFetch<{ items: MaterialSummary[] }>(`/api/materials?${params.toString()}`)
        .then((res) => setMaterials(res.items))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [subject, academy, minUnit, maxUnit, q]);

  function handleUpdated(item: MaterialSummary) {
    setMaterials((prev) => prev.map((m) => (m.id === item.id ? item : m)));
    setSelected(item);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">자료 둘러보기</h1>
        <p className="text-sm text-muted">친구들이 공유한 내신 자료를 검색하고 포인트로 열람하세요.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">전체 과목</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input
          list="academy-options"
          placeholder="출처 학원"
          value={academy}
          onChange={(e) => setAcademy(e.target.value)}
        />
        <datalist id="academy-options">
          {academies.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <Input
          type="number"
          min={0}
          placeholder="최소 단원"
          value={minUnit}
          onChange={(e) => setMinUnit(e.target.value)}
        />
        <Input
          type="number"
          min={0}
          placeholder="최대 단원"
          value={maxUnit}
          onChange={(e) => setMaxUnit(e.target.value)}
        />
        <Input
          placeholder="제목 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted">불러오는 중...</p>
      ) : materials.length === 0 ? (
        <EmptyState title="조건에 맞는 자료가 없어요" description="필터를 조정하거나 직접 자료를 등록해보세요." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      )}

      <MaterialModal material={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
    </div>
  );
}
