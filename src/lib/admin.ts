import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { serializeMaterial, serializeMaterialAdmin } from "@/lib/materials";
import type { MaterialStatus } from "@/generated/prisma/client";

export async function getAdminStats() {
  const [
    userCount,
    studentCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    purchaseCount,
    totalPointsAgg,
    pointsSpentAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "student" } }),
    prisma.material.count({ where: { status: "pending" } }),
    prisma.material.count({ where: { status: "approved" } }),
    prisma.material.count({ where: { status: "rejected" } }),
    prisma.purchase.count(),
    prisma.user.aggregate({ _sum: { points: true } }),
    prisma.purchase.aggregate({ _sum: { pointsPaid: true } }),
  ]);

  return {
    userCount,
    studentCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    purchaseCount,
    totalPoints: totalPointsAgg._sum.points ?? 0,
    pointsSpent: pointsSpentAgg._sum.pointsPaid ?? 0,
  };
}

export async function adminListUsers(query?: string | null) {
  const where = query
    ? { OR: [{ email: { contains: query } }, { name: { contains: query } }] }
    : {};

  const [users, materials, purchaseCounts] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.material.findMany({ select: { uploaderId: true, status: true } }),
    prisma.purchase.groupBy({ by: ["userId"], _count: { _all: true } }),
  ]);

  const uploadCountMap = new Map<number, number>();
  const sharedCountMap = new Map<number, number>();
  for (const m of materials) {
    uploadCountMap.set(m.uploaderId, (uploadCountMap.get(m.uploaderId) ?? 0) + 1);
    if (m.status === "approved") {
      sharedCountMap.set(m.uploaderId, (sharedCountMap.get(m.uploaderId) ?? 0) + 1);
    }
  }
  const purchaseCountMap = new Map(purchaseCounts.map((p) => [p.userId, p._count._all]));

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    points: u.points,
    status: u.status,
    createdAt: u.createdAt,
    sharedCount: sharedCountMap.get(u.id) ?? 0,
    uploadCount: uploadCountMap.get(u.id) ?? 0,
    purchaseCount: purchaseCountMap.get(u.id) ?? 0,
  }));
}

export async function adminGetUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "사용자를 찾을 수 없습니다.");

  const [uploads, purchases, pointTransactions] = await Promise.all([
    prisma.material.findMany({ where: { uploaderId: id }, orderBy: { createdAt: "desc" } }),
    prisma.purchase.findMany({
      where: { userId: id },
      include: { material: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pointTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      points: user.points,
      status: user.status,
      createdAt: user.createdAt,
    },
    uploads: uploads.map((m) => serializeMaterialAdmin(m)),
    purchases: purchases.map((p) => ({
      purchaseId: p.id,
      pointsPaid: p.pointsPaid,
      purchasedAt: p.createdAt,
      ...serializeMaterial(p.material, true),
    })),
    pointTransactions,
  };
}

export async function adminUpdateUser(
  id: number,
  params: { pointsDelta?: number; memo?: string; role?: string; status?: string }
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "사용자를 찾을 수 없습니다.");

  return prisma.$transaction(async (tx) => {
    let points = user.points;
    if (params.pointsDelta) {
      const nextPoints = Math.max(0, user.points + params.pointsDelta);
      const actualChange = nextPoints - user.points;
      if (actualChange !== 0) {
        await tx.pointTransaction.create({
          data: {
            userId: id,
            amount: actualChange,
            reason: "admin_adjust",
            memo: params.memo?.trim() || null,
          },
        });
      }
      points = nextPoints;
    }

    return tx.user.update({
      where: { id },
      data: {
        points,
        role: params.role === "admin" || params.role === "student" ? params.role : undefined,
        status:
          params.status === "active" || params.status === "suspended" ? params.status : undefined,
      },
    });
  });
}

export async function adminListMaterials(status?: string | null) {
  const where =
    status && status !== "all" ? { status: status as MaterialStatus } : {};

  const materials = await prisma.material.findMany({
    where,
    include: { uploader: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return materials.map((m) => ({
    ...serializeMaterialAdmin(m),
    uploaderEmail: m.uploader.email,
    uploaderName: m.uploader.name,
  }));
}

export async function adminApproveMaterial(id: number, pointCost: number, rewardPoints: number) {
  if (!Number.isInteger(pointCost) || pointCost < 0) {
    throw new HttpError(400, "구매 포인트를 올바르게 입력해주세요.");
  }
  if (!Number.isInteger(rewardPoints) || rewardPoints < 0) {
    throw new HttpError(400, "보상 포인트를 올바르게 입력해주세요.");
  }

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new HttpError(404, "자료를 찾을 수 없습니다.");
  if (material.status === "approved") throw new HttpError(400, "이미 승인된 자료입니다.");

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.material.update({
      where: { id },
      data: {
        status: "approved",
        pointCost,
        rewardPoints,
        approvedAt: new Date(),
        rejectReason: null,
      },
    });
    await tx.user.update({
      where: { id: material.uploaderId },
      data: { points: { increment: rewardPoints } },
    });
    await tx.pointTransaction.create({
      data: {
        userId: material.uploaderId,
        amount: rewardPoints,
        reason: "upload_reward",
        refMaterialId: id,
      },
    });
    return m;
  });

  return serializeMaterialAdmin(updated);
}

export async function adminRejectMaterial(id: number, reason: string) {
  if (!reason?.trim()) throw new HttpError(400, "반려 사유를 입력해주세요.");

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new HttpError(404, "자료를 찾을 수 없습니다.");

  const updated = await prisma.material.update({
    where: { id },
    data: { status: "rejected", rejectReason: reason.trim() },
  });

  return serializeMaterialAdmin(updated);
}
