import "server-only";
import { createProduct } from "@/lib/products/service";

/**
 * Creates starter product shells after onboarding so the dossier workflow
 * has a product to attach to immediately.
 */
export async function scaffoldOnboardingProducts(
  companyId: string,
  companyName: string,
  opts: { productCount?: number; industry?: string },
): Promise<string[]> {
  const raw = opts.productCount ?? 1;
  const count = Math.min(Math.max(opts.industry === "MEDICAL" ? Math.max(raw, 1) : raw, 0), 5);
  if (count === 0) return [];

  const ids: string[] = [];
  const base = companyName.trim() || "Product";

  for (let i = 1; i <= count; i++) {
    const suffix = count === 1 ? "" : ` ${i}`;
    const product = await createProduct(companyId, {
      name: `${base}${suffix}`,
      deviceClass: "CLASS_IIA",
      intendedPurpose: null,
      isInvasive: false,
      hasMeasuringFn: false,
      containsSoftware: false,
      variants: [
        {
          brand: base,
          models: [{ name: `Model${suffix || " 1"}`, sterilizations: ["NON_STERILE"] }],
        },
      ],
    });
    ids.push(product.id);
  }

  return ids;
}
