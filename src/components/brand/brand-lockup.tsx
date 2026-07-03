import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

export function BrandWordmark({ className }: { className?: string }) {
  return <BrandLogo variant="logo" size="sm" className={className} />;
}

export function BrandLockup({
  size = "md",
  href,
  className,
  variant = "logo",
  priority,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  variant?: "icon" | "logo" | "slogan";
  /** @deprecated Logo image includes wordmark */
  showWordmark?: boolean;
  priority?: boolean;
}) {
  return (
    <BrandLogo
      variant={variant}
      size={size}
      href={href}
      className={cn(className)}
      priority={priority}
    />
  );
}
