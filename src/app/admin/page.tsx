import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPlatformAdminEmails, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listAdminCustomers } from "@/lib/admin/customers";
import { listAdminDemoGrants } from "@/lib/admin/demo";
import { AdminCustomersPanel } from "@/components/admin/admin-customers-panel";
import { AdminDemoPanel } from "@/components/admin/admin-demo-panel";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login?next=/admin");

  if (getPlatformAdminEmails().length === 0) notFound();
  if (!isPlatformAdmin(ctx.user.email)) {
    return <AdminAccessDenied signedInAs={ctx.user.email} />;
  }

  const [customers, demo] = await Promise.all([listAdminCustomers(), listAdminDemoGrants()]);

  return (
    <>
      <AdminCustomersPanel {...customers} />
      <div className="container max-w-7xl pb-12">
        <AdminDemoPanel initialData={demo} />
      </div>
    </>
  );
}
