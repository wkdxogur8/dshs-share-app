import path from "node:path";

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".hwp",
  ".hwpx",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".zip",
];

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".hwp": "application/x-hwp",
  ".hwpx": "application/haansofthwpx",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".zip": "application/zip",
};

export function isAllowedExtension(filename: string) {
  return ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

export function mimeFor(filename: string) {
  return MIME_MAP[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}
