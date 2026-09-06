import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/browse");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">관리자 페이지</h1>
        <p className="text-sm text-muted">회원과 자료를 관리합니다.</p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
