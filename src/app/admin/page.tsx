import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPlatformAdminEmails, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listAdminCustomers } from "@/lib/admin/customers";
import { AdminCustomersPanel } from "@/components/admin/admin-customers-panel";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login?next=/admin");

  if (getPlatformAdminEmails().length === 0) notFound();
  if (!isPlatformAdmin(ctx.user.email)) {
    return <AdminAccessDenied signedInAs={ctx.user.email} />;
  }

  const data = await listAdminCustomers();

  return <AdminCustomersPanel {...data} />;
}
