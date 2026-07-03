import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listFilesDetailed, listProductsWithDossier } from "@/lib/data/queries";
import { FilesView } from "./files-view";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const ctx = await requireCompany();
  const [files, products] = await Promise.all([
    listFilesDetailed(ctx.companyId),
    listProductsWithDossier(ctx.companyId),
  ]);

  return (
    <FilesView
      initialFiles={files}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
      canUpload={hasRole(ctx.role, "CONSULTANT")}
      canDelete={hasRole(ctx.role, "QUALITY_MANAGER")}
    />
  );
}
