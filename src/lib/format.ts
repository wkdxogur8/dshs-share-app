export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)}${units[unitIndex]}`;
}

export const POINT_REASON_LABEL: Record<string, string> = {
  signup_bonus: "가입 축하 포인트",
  upload_reward: "자료 승인 보상",
  purchase: "자료 열람",
  admin_adjust: "관리자 조정",
};

export const MATERIAL_STATUS_LABEL: Record<string, string> = {
  pending: "검토중",
  approved: "공개중",
  rejected: "반려됨",
};
