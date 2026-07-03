"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { ApprovedSuppliersPanel } from "@/components/operational/approved-suppliers-panel";

export function ApprovedSuppliersView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("suppliers.title")} description={t("suppliers.desc")} />
      <ApprovedSuppliersPanel canEdit={canEdit} />
    </div>
  );
}
