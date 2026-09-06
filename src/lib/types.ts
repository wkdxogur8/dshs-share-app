export type MaterialStatus = "pending" | "approved" | "rejected";
export type Role = "student" | "admin";
export type UserStatus = "active" | "suspended";

export type MaterialSummary = {
  id: number;
  title: string;
  subject: string;
  unitCount: number;
  sourceAcademy: string;
  pointCost: number | null;
  status: MaterialStatus;
  createdAt: string;
  rejectReason: string | null;
  unlocked: boolean;
  description?: string;
  fileName?: string;
  fileSize?: number;
};

export type MaterialAdmin = {
  id: number;
  title: string;
  subject: string;
  unitCount: number;
  sourceAcademy: string;
  description: string;
  fileName: string;
  fileSize: number;
  status: MaterialStatus;
  pointCost: number | null;
  rewardPoints: number | null;
  rejectReason: string | null;
  uploaderId: number;
  createdAt: string;
  approvedAt: string | null;
  uploaderEmail?: string;
  uploaderName?: string;
};

export type PublicUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  points: number;
  status: UserStatus;
  createdAt: string;
};

export type PointTransaction = {
  id: number;
  userId: number;
  amount: number;
  reason: string;
  refMaterialId: number | null;
  memo: string | null;
  createdAt: string;
};

export type AdminUserRow = {
  id: number;
  email: string;
  name: string;
  role: Role;
  points: number;
  status: UserStatus;
  createdAt: string;
  sharedCount: number;
  uploadCount: number;
  purchaseCount: number;
};

export type PurchaseRecord = MaterialSummary & {
  purchaseId: number;
  pointsPaid: number;
  purchasedAt: string;
};

export type MetaResponse = {
  subjects: string[];
  academies: string[];
  allowedEmailDomains: string[];
  signupBonusPoints: number;
};
