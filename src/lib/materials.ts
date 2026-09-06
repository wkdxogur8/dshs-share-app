import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { HttpError } from "@/lib/http";
import { isAllowedExtension } from "@/lib/uploads";
import { SUBJECTS } from "@/lib/subjects";
import { suggestedPoints } from "@/lib/points";
import type { Material, User } from "@/generated/prisma/client";

export const UPLOADS_ROOT = path.join(process.cwd(), "storage", "uploads");

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
}

function isUnlockedFor(material: Material, user: User | null, purchased: boolean) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (material.uploaderId === user.id) return true;
  return purchased;
}

export function serializeMaterial(material: Material, unlocked: boolean) {
  const base = {
    id: material.id,
    title: material.title,
    subject: material.subject,
    unitCount: material.unitCount,
    sourceAcademy: material.sourceAcademy,
    pointCost: material.pointCost,
    status: material.status,
    createdAt: material.createdAt,
    rejectReason: material.rejectReason,
    unlocked,
  };
  if (!unlocked) return base;
  return {
    ...base,
    description: material.description,
    fileName: material.fileName,
    fileSize: material.fileSize,
  };
}

export function serializeMaterialAdmin(material: Material) {
  return {
    id: material.id,
    title: material.title,
    subject: material.subject,
    unitCount: material.unitCount,
    sourceAcademy: material.sourceAcademy,
    description: material.description,
    fileName: material.fileName,
    fileSize: material.fileSize,
    status: material.status,
    pointCost: material.pointCost,
    rewardPoints: material.rewardPoints,
    rejectReason: material.rejectReason,
    uploaderId: material.uploaderId,
    createdAt: material.createdAt,
    approvedAt: material.approvedAt,
  };
}

export async function listMaterials(params: {
  currentUser: User | null;
  subject?: string | null;
  academy?: string | null;
  minUnit?: number | null;
  maxUnit?: number | null;
  q?: string | null;
  mine?: boolean;
}) {
  const { currentUser, subject, academy, minUnit, maxUnit, q, mine } = params;

  const where: Record<string, unknown> = {};
  if (mine) {
    if (!currentUser) throw new HttpError(401, "로그인이 필요합니다.");
    where.uploaderId = currentUser.id;
  } else {
    where.status = "approved";
  }
  if (subject) where.subject = subject;
  if (academy) where.sourceAcademy = { contains: academy };
  if (minUnit != null || maxUnit != null) {
    const unitCount: Record<string, number> = {};
    if (minUnit != null) unitCount.gte = minUnit;
    if (maxUnit != null) unitCount.lte = maxUnit;
    where.unitCount = unitCount;
  }
  if (q) where.title = { contains: q };

  const materials = await prisma.material.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  if (!materials.length) return [];

  let purchasedIds = new Set<number>();
  if (currentUser) {
    const purchases = await prisma.purchase.findMany({
      where: { userId: currentUser.id, materialId: { in: materials.map((m) => m.id) } },
      select: { materialId: true },
    });
    purchasedIds = new Set(purchases.map((p) => p.materialId));
  }

  return materials.map((m) =>
    serializeMaterial(m, isUnlockedFor(m, currentUser, purchasedIds.has(m.id)))
  );
}

export async function getMaterialForUser(id: number, currentUser: User | null) {
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new HttpError(404, "자료를 찾을 수 없습니다.");

  const isOwnerOrAdmin =
    !!currentUser && (currentUser.role === "admin" || material.uploaderId === currentUser.id);
  if (material.status !== "approved" && !isOwnerOrAdmin) {
    throw new HttpError(404, "자료를 찾을 수 없습니다.");
  }

  let purchased = false;
  if (currentUser) {
    purchased = !!(await prisma.purchase.findUnique({
      where: { userId_materialId: { userId: currentUser.id, materialId: material.id } },
    }));
  }
  return serializeMaterial(material, isUnlockedFor(material, currentUser, purchased));
}

export async function createMaterial(params: {
  uploader: User;
  title: string;
  subject: string;
  unitCount: number;
  sourceAcademy: string;
  description: string;
  file: File;
}) {
  const { uploader, title, subject, unitCount, sourceAcademy, description, file } = params;

  if (!title?.trim()) throw new HttpError(400, "제목을 입력해주세요.");
  if (!SUBJECTS.includes(subject as (typeof SUBJECTS)[number])) {
    throw new HttpError(400, "올바른 과목을 선택해주세요.");
  }
  if (!Number.isInteger(unitCount) || unitCount < 1 || unitCount > 50) {
    throw new HttpError(400, "단원 수를 1~50 사이로 입력해주세요.");
  }
  if (!sourceAcademy?.trim()) throw new HttpError(400, "출처를 입력해주세요.");
  if (!description?.trim()) throw new HttpError(400, "자료 설명을 입력해주세요.");
  if (!file || file.size === 0) throw new HttpError(400, "파일을 첨부해주세요.");
  if (!isAllowedExtension(file.name)) {
    throw new HttpError(400, "허용되지 않는 파일 형식입니다.");
  }
  if (file.size > config.maxUploadBytes) {
    throw new HttpError(
      400,
      `파일 용량은 ${Math.floor(config.maxUploadBytes / 1024 / 1024)}MB를 초과할 수 없습니다.`
    );
  }

  await ensureUploadsDir();
  const ext = path.extname(file.name).toLowerCase();
  const storedName = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_ROOT, storedName), buffer);

  const trimmedDescription = description.trim();
  const material = await prisma.material.create({
    data: {
      title: title.trim(),
      subject,
      unitCount,
      sourceAcademy: sourceAcademy.trim(),
      description: trimmedDescription,
      fileName: file.name,
      filePath: storedName,
      fileSize: file.size,
      uploaderId: uploader.id,
    },
  });

  return {
    item: serializeMaterial(material, true),
    suggested: suggestedPoints(unitCount, trimmedDescription.length),
  };
}

export async function purchaseMaterial(materialId: number, user: User) {
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material || material.status !== "approved") {
    throw new HttpError(404, "자료를 찾을 수 없습니다.");
  }
  if (material.uploaderId === user.id) {
    return serializeMaterial(material, true);
  }

  const existing = await prisma.purchase.findUnique({
    where: { userId_materialId: { userId: user.id, materialId } },
  });
  if (existing) {
    return serializeMaterial(material, true);
  }

  const cost = material.pointCost ?? 0;

  await prisma.$transaction(async (tx) => {
    const freshUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (freshUser.points < cost) {
      throw new HttpError(400, "포인트가 부족합니다.");
    }
    await tx.user.update({ where: { id: user.id }, data: { points: { decrement: cost } } });
    await tx.purchase.create({ data: { userId: user.id, materialId, pointsPaid: cost } });
    await tx.pointTransaction.create({
      data: { userId: user.id, amount: -cost, reason: "purchase", refMaterialId: materialId },
    });
  });

  return serializeMaterial(material, true);
}

export async function getMaterialFileForDownload(materialId: number, user: User) {
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) throw new HttpError(404, "자료를 찾을 수 없습니다.");

  const isOwnerOrAdmin = user.role === "admin" || material.uploaderId === user.id;
  if (!isOwnerOrAdmin) {
    const purchased = await prisma.purchase.findUnique({
      where: { userId_materialId: { userId: user.id, materialId } },
    });
    if (!purchased) throw new HttpError(403, "구매 후 다운로드할 수 있습니다.");
  }

  return { filePath: path.join(UPLOADS_ROOT, material.filePath), fileName: material.fileName };
}

export async function myPurchases(user: User) {
  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    include: { material: true },
    orderBy: { createdAt: "desc" },
  });
  return purchases.map((p) => ({
    purchaseId: p.id,
    pointsPaid: p.pointsPaid,
    purchasedAt: p.createdAt,
    ...serializeMaterial(p.material, true),
  }));
}

export async function myPointHistory(user: User) {
  return prisma.pointTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getMeta() {
  const academiesRaw = await prisma.material.findMany({
    where: { status: "approved" },
    select: { sourceAcademy: true },
    distinct: ["sourceAcademy"],
  });
  return {
    subjects: SUBJECTS,
    academies: academiesRaw.map((a) => a.sourceAcademy).sort((a, b) => a.localeCompare(b, "ko")),
    allowedEmailDomains: config.allowedEmailDomains,
    signupBonusPoints: config.signupBonusPoints,
  };
}
