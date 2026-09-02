import Link from "next/link";
import { getStaffSession } from "@/lib/auth/staff";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { ChangePasswordForm } from "@/components/staff/ChangePasswordForm";

export default async function StaffPasswordPage() {
  const session = await getStaffSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-xs px-6 py-16 text-center text-sm text-zinc-500">
        <p className="mb-4">ログインしていません</p>
        <div className="flex flex-col gap-2">
          <Link href="/register" className="underline">
            レジアプリでログイン
          </Link>
          <Link href="/admin" className="underline">
            管理画面でログイン
          </Link>
        </div>
      </div>
    );
  }

  const backHref = session.role === "admin" ? "/admin" : "/register";

  return (
    <div className="min-h-screen">
      <StaffHeader
        title="パスワード変更"
        name={session.displayName}
        backHref={backHref}
        backLabel="戻る"
      />
      <ChangePasswordForm />
    </div>
  );
}
