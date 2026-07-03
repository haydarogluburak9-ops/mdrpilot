import "server-only";
import { prisma } from "@/lib/db";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";

export async function buildCompanyProductsContext(
  companyId: string,
  locale: "tr" | "en",
): Promise<string> {
  const products = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    select: {
      name: true,
      brand: true,
      model: true,
      deviceClass: true,
      basicUdiDi: true,
      udiDi: true,
      isSterile: true,
      sterilization: true,
      intendedPurpose: true,
      indications: true,
    },
    orderBy: { name: "asc" },
    take: 12,
  });

  if (products.length === 0) {
    return locale === "tr"
      ? "Ürün portföyü: henüz kayıtlı ürün yok — genel tıbbi cihaz üreticisi varsayımı kullan."
      : "Product portfolio: no registered products yet — assume generic medical device manufacturer.";
  }

  const header =
    locale === "tr"
      ? "Firma ürün portföyü (form/FSN/örnek kayıtlarda bu ürünleri kullan):"
      : "Company product portfolio (use these products in forms/FSN/sample records):";

  const lines = products.map((p, i) => {
    const cls = DEVICE_CLASS_LABEL[p.deviceClass] ?? p.deviceClass;
    const udi = p.udiDi || p.basicUdiDi || "—";
    const sterile = p.isSterile
      ? locale === "tr"
        ? `steril (${p.sterilization})`
        : `sterile (${p.sterilization})`
      : locale === "tr"
        ? "steril değil"
        : "non-sterile";
    const purpose = (p.intendedPurpose ?? p.indications ?? "").slice(0, 120);
    return `${i + 1}. ${p.name}${p.model ? ` / ${p.model}` : ""} | ${cls} | UDI: ${udi} | ${sterile}${purpose ? ` | ${purpose}` : ""}`;
  });

  return `${header}\n${lines.join("\n")}`;
}
