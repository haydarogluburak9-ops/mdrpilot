import { BrandLogo } from "@/components/brand/brand-logo";

/** MDRpilot shield mark — use in tight UI slots (sidebar, mobile nav). */
export function BrandMark({ className }: { className?: string }) {
  return <BrandLogo variant="icon" size="sm" className={className} />;
}
