"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone };
type PushToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<PushToast | null>(null);

export function useToast(): PushToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-success-soft text-success ring-1 ring-success/20",
  error: "bg-danger-soft text-danger ring-1 ring-danger/20",
  info: "bg-surface text-foreground ring-1 ring-border shadow-md",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback<PushToast>((message, tone = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium ${TONE_STYLES[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
