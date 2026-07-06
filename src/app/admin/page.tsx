import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPlatformAdminEmails, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listAdminCustomers } from "@/lib/admin/customers";
import { listAdminDemoGrants } from "@/lib/admin/demo";
import { listAdminUsers } from "@/lib/admin/users";
import { AdminCustomersPanel } from "@/components/admin/admin-customers-panel";
import { AdminDemoPanel } from "@/components/admin/admin-demo-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login?next=/admin");

  if (getPlatformAdminEmails().length === 0) notFound();
  if (!isPlatformAdmin(ctx.user.email)) {
    return <AdminAccessDenied signedInAs={ctx.user.email} />;
  }

  const [customers, demo, users] = await Promise.all([
    listAdminCustomers(),
    listAdminDemoGrants(),
    listAdminUsers(),
  ]);

  return (
    <>
      <AdminCustomersPanel {...customers} />
      <div className="container max-w-7xl pb-12">
        <AdminUsersPanel initialData={users} />
        <AdminDemoPanel initialData={demo} />
      </div>
    </>
  );
}
