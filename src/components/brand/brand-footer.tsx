import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useI18n } from "@/components/providers/i18n-provider";

/** Footer lockup: large wordmark + readable slogan text (not tiny PNG glyphs). */
export function BrandFooter({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={className}>
      <Link href="/" className="inline-block">
        <BrandLogo variant="logo" size="lg" className="!h-14 md:!h-[4.5rem]" />
      </Link>
      <p className="mt-4 text-sm font-semibold leading-snug tracking-wide text-foreground md:text-base">
        {t("brand.slogan")}
      </p>
      <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground md:text-sm">
        {t("brand.certLine")}
      </p>
    </div>
  );
}
