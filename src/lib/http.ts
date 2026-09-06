export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function jsonError(status: number, message: string, details?: unknown) {
  return Response.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

export async function withApi(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonError(err.status, err.message, err.details);
    }
    console.error("[API 오류]", err);
    return jsonError(500, "서버에서 오류가 발생했습니다.");
  }
}

/** 상태를 변경하는 요청은 커스텀 헤더를 요구해 단순 크로스사이트 폼 전송을 막는다. */
export function requireFetchHeader(req: Request) {
  if (req.headers.get("x-requested-with") !== "dshs-share") {
    throw new HttpError(400, "잘못된 요청입니다.");
  }
}

export function getClientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
