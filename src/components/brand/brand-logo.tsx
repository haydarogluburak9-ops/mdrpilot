import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGOS, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type BrandLogoVariant = "icon" | "logo" | "slogan";

const variantSrc: Record<BrandLogoVariant, string> = {
  icon: BRAND_LOGOS.icon,
  logo: BRAND_LOGOS.logo,
  slogan: BRAND_LOGOS.slogan,
};

/** Display height per variant/size (width follows aspect ratio). */
const heightClass: Record<BrandLogoVariant, Record<"sm" | "md" | "lg", string>> = {
  icon: { sm: "h-8", md: "h-9", lg: "h-12" },
  logo: { sm: "h-9", md: "h-11", lg: "h-14" },
  slogan: { sm: "h-28", md: "h-40", lg: "h-52" },
};

const intrinsic: Record<BrandLogoVariant, { width: number; height: number }> = {
  icon: { width: 512, height: 512 },
  logo: { width: 900, height: 400 },
  slogan: { width: 900, height: 1100 },
};

export function BrandLogo({
  variant = "logo",
  size = "md",
  href,
  className,
  priority,
}: {
  variant?: BrandLogoVariant;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  priority?: boolean;
}) {
  const img = (
    <Image
      src={variantSrc[variant]}
      alt={BRAND_NAME}
      width={intrinsic[variant].width}
      height={intrinsic[variant].height}
      className={cn("w-auto object-contain", heightClass[variant][size], className)}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {img}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{img}</span>;
}
