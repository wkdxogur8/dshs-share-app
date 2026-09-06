import { Badge } from "@/components/ui";
import type { MaterialSummary } from "@/lib/types";

export function MaterialCard({
  material,
  onClick,
}: {
  material: MaterialSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
    >
      <div className="flex w-full items-center justify-between">
        <Badge tone="brand">{material.subject}</Badge>
        {material.unlocked ? (
          <span className="text-xs font-semibold text-success">🔓 열람 가능</span>
        ) : (
          <span className="text-xs font-semibold text-muted">🔒 {material.pointCost ?? 0}P</span>
        )}
      </div>
      <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
        {material.title}
      </h3>
      <div className="flex w-full items-center justify-between text-xs text-muted">
        <span>
          {material.sourceAcademy} · {material.unitCount}단원
        </span>
      </div>
    </button>
  );
}
