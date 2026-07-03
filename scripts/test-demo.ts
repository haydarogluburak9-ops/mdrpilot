/* Verifies demo-mode requirements: deliberate EO Cannula gaps, consultant critical
 * findings, and the Demo Executive Report PDF export. Requires server + seeded DB. */
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();
let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`PASS  ${name}`); pass++; } else { console.log(`FAIL  ${name}  (${detail})`); fail++; }
}

class Jar {
  cookies = new Map<string, string>();
  apply(res: Response) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";"); const i = pair.indexOf("=");
      if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() { return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; "); }
}
async function login(email: string, pw: string) {
  const jar = new Jar();
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
  jar.apply(res); return jar;
}
async function req(method: string, path: string, jar: Jar, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Cookie: jar.header(), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  jar.apply(res); let data: any = null; try { data = await res.json(); } catch { /* */ }
  return { status: res.status, data };
}

async function main() {
  const company = await prisma.company.findFirst({ where: { name: "Yılmaz Bio Medikal" } });
  const eo = await prisma.product.findFirst({ where: { companyId: company!.id, name: "EO Sterile Ophthalmic Cannula" } });
  assert("Demo product exists", !!eo);

  // Seeded deliberate gaps
  const gsprMissing = await prisma.gSPRItem.findMany({ where: { productId: eo!.id, gsprNo: { in: ["10.1", "11.2", "11.4"] }, status: "MISSING" } });
  assert("Biocompat/EO/sterilization GSPR missing", gsprMissing.length === 3, `${gsprMissing.length}/3`);
  const shelf = await prisma.technicalFileSection.findFirst({ where: { productId: eo!.id, key: "shelf-life" } });
  assert("Shelf-life section missing", shelf?.status === "MISSING", String(shelf?.status));
  const pmcf = await prisma.pMCFPlan.findFirst({ where: { productId: eo!.id } });
  assert("PMCF justification missing", pmcf?.status === "MISSING", String(pmcf?.status));
  const pms = await prisma.pMSPlan.findFirst({ where: { productId: eo!.id } });
  assert("PMS plan weak (DRAFT)", pms?.status === "DRAFT", String(pms?.status));

  // Strengths
  const devDesc = await prisma.technicalFileSection.findFirst({ where: { productId: eo!.id, key: "device-description" } });
  assert("Device description approved (strength)", devDesc?.status === "APPROVED");
  const ifu = await prisma.iFUDocument.findFirst({ where: { productId: eo!.id } });
  assert("IFU draft exists (strength)", !!ifu);
  const qm = await prisma.composerDocument.findFirst({ where: { companyId: company!.id, type: "ISO13485_QUALITY_MANUAL", status: "DRAFT" } });
  assert("Quality Manual draft exists (strength)", !!qm);

  // CAPA + findings
  const openCapa = await prisma.cAPA.count({ where: { productId: eo!.id, status: { not: "CLOSED" } } });
  assert("Exactly 2 open CAPAs", openCapa === 2, String(openCapa));
  const major = await prisma.auditFinding.count({ where: { productId: eo!.id, severity: "MAJOR" } });
  const minor = await prisma.auditFinding.count({ where: { productId: eo!.id, severity: "MINOR" } });
  assert("One major audit finding", major === 1, String(major));
  assert("One minor audit finding", minor === 1, String(minor));

  // Consultant finds critical gaps on demo product
  const owner = await login("elif@yilmazbio.com", "Demo1234!");
  const analysis = await req("POST", "/api/consultant/analyze", owner, { productId: eo!.id, standard: "COMBINED" });
  assert("Consultant analyze -> 200", analysis.status === 200, String(analysis.status));
  const critical = (analysis.data?.result?.gaps ?? []).filter((g: any) => g.severity === "Critical");
  assert("Consultant finds critical gaps", critical.length > 0, `${critical.length} critical`);

  // Demo Executive Report PDF
  const exp = await req("POST", "/api/executive/export", owner, { productId: eo!.id, standard: "COMBINED" });
  assert("Executive export -> 200", exp.status === 200, String(exp.status));
  assert("Executive export COMPLETED", exp.data?.job?.status === "COMPLETED", String(exp.data?.job?.status));
  const job = await prisma.exportJob.findFirst({ where: { companyId: company!.id, type: "DEMO_EXECUTIVE_REPORT_PDF" }, orderBy: { createdAt: "desc" } });
  assert("Executive export job in DB with file", !!job?.fileKey && (job?.sizeBytes ?? 0) > 0);

  // RBAC: viewer cannot export executive report
  const viewer = await login("viewer@yilmazbio.com", "Demo1234!");
  const vexp = await req("POST", "/api/executive/export", viewer, {});
  assert("Viewer executive export -> 403", vexp.status === 403, String(vexp.status));

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
