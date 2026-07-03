/* End-to-end test for the Standards Knowledge Base + RAG + clause citation feature.
 * Requires the dev server on http://localhost:3000 and a seeded DB. */
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();
let pass = 0, fail = 0;

function assert(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`PASS  ${name}`); pass++; }
  else { console.log(`FAIL  ${name}  (${detail})`); fail++; }
}

class Jar {
  cookies = new Map<string, string>();
  apply(res: Response) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  header() { return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; "); }
}

async function login(email: string, pw: string): Promise<Jar> {
  const jar = new Jar();
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
  jar.apply(res);
  return jar;
}

async function req(method: string, path: string, jar: Jar, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Cookie: jar.header(), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  jar.apply(res);
  let data: any = null; try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

async function uploadStandard(jar: Jar, fields: Record<string, string>, fileName: string, content: string) {
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(Buffer.from(content))], { type: "application/pdf" }), fileName);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const res = await fetch(`${BASE}/api/standards/upload`, { method: "POST", headers: { Cookie: jar.header() }, body: fd });
  let data: any = null; try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

// Minimal valid PDF so magic-byte validation passes.
function fakePdf(text: string) {
  return `%PDF-1.4\n% test standard\n${text}\n%%EOF`;
}

async function main() {
  console.log("\n=== Auth ===");
  const owner = await login("elif@yilmazbio.com", "Demo1234!");
  const viewer = await login("viewer@yilmazbio.com", "Demo1234!");
  assert("Owner + Viewer logged in", owner.cookies.size > 0 && viewer.cookies.size > 0);

  console.log("\n=== Standards Library (seed) ===");
  const list = await req("GET", "/api/standards", owner);
  const codes = (list.data?.standards ?? []).map((s: any) => s.code);
  assert("GET /api/standards -> 200", list.status === 200);
  assert("4 seeded standards present", ["ISO 13485", "ISO 9001", "MDR 2017/745", "ISO 14971"].every((c) => codes.includes(c)), codes.join(","));
  const mdr = (list.data?.standards ?? []).find((s: any) => s.code === "MDR 2017/745");
  assert("Standard has clauses", (mdr?.clauseCount ?? 0) > 0, `count=${mdr?.clauseCount}`);

  console.log("\n=== Clause detail ===");
  const detail = await req("GET", `/api/standards/${mdr.id}`, owner);
  assert("GET standard detail -> 200 with clauses", detail.status === 200 && detail.data.standard.clauses.length > 0);
  const annex2 = detail.data.standard.clauses.find((c: any) => c.clauseNo.includes("Annex II"));
  assert("Clause exposes document/evidence expectations", !!annex2 && Array.isArray(annex2.documentExpectations), JSON.stringify(annex2 ?? {}));

  console.log("\n=== Copyright: no verbatim ISO full text seeded ===");
  const seeded = await prisma.standard.findMany({ where: { companyId: null }, include: { clauses: true } });
  const longest = Math.max(...seeded.flatMap((s) => s.clauses.map((c) => c.summary.length)));
  assert("Clause summaries are short (paraphrased, not full text)", longest < 600, `longest=${longest}`);
  assert("ISO standards seeded as TEMPLATE_SUMMARY (not licensed full text)",
    seeded.filter((s) => s.code.startsWith("ISO")).every((s) => s.sourceType === "TEMPLATE_SUMMARY"));

  console.log("\n=== Composer citations ===");
  const product = await prisma.product.findFirst({ where: { company: { name: "Yılmaz Bio Medikal" } }, orderBy: { createdAt: "asc" } });
  const gen = await req("POST", "/api/composer/generate", owner, { type: "MDR_TECHNICAL_FILE_NARRATIVE", productId: product!.id, language: "en" });
  const docId = gen.data?.document?.id;
  assert("Composer generate -> 201", gen.status === 201 && !!docId, `status=${gen.status}`);
  const cites = await prisma.aICitation.findMany({ where: { targetType: "COMPOSER_DOCUMENT", targetId: docId } });
  assert("AICitation rows created for composer doc", cites.length > 0, `count=${cites.length}`);
  assert("Composer markdown contains Regulatory References", (gen.data?.document?.contentMarkdown ?? "").includes("Regulatory References"));
  assert("Composer markdown contains Relevant clauses", (gen.data?.document?.contentMarkdown ?? "").includes("Relevant clauses"));

  console.log("\n=== Audit clause-level gaps (deterministic) ===");
  // Verified via the scoring engine import used by the audit page.
  const { computeClauseGaps } = await import("../src/lib/rag/audit-gaps");
  const prodFull = await prisma.product.findUnique({
    where: { id: product!.id },
    include: { technicalSections: true, gsprItems: true, riskItems: true },
  });
  const gaps = computeClauseGaps(prodFull as any);
  assert("Clause-level gaps produced", gaps.length > 0, `count=${gaps.length}`);
  assert("Gaps reference standards + clauseNo", gaps.every((g) => g.standardCode && g.clauseNo));

  console.log("\n=== Upload licensed/internal standard (CONSULTANT+) ===");
  const up = await uploadStandard(owner,
    { code: "SOP-RM-01", title: "Risk Management Procedure", version: "v1.0", sourceType: "INTERNAL_PROCEDURE" },
    "risk-procedure.pdf", fakePdf("Risk management procedure covering hazard identification, risk control and residual risk per ISO 14971."));
  assert("Owner upload -> 201", up.status === 201, `status=${up.status} ${JSON.stringify(up.data)}`);
  const uploadedId = up.data?.standard?.id;
  const uploadedRow = await prisma.standard.findUnique({ where: { id: uploadedId } });
  assert("Uploaded standard is private (isPublic=false, has companyId)", uploadedRow?.isPublic === false && !!uploadedRow?.companyId);

  console.log("\n=== RAG indexing pipeline (knowledge base) ===");
  const seededChunks = await prisma.knowledgeChunk.count({ where: { companyId: null, standardId: { not: null } } });
  assert("Public standard clauses indexed into KnowledgeChunk", seededChunks > 0, `chunks=${seededChunks}`);
  // End-to-end RAG proof: composer citations resolved to real clause IDs via the retriever.
  const resolved = await prisma.aICitation.findMany({ where: { targetType: "COMPOSER_DOCUMENT", targetId: docId } });
  assert("Composer citations resolved to real clause IDs (retrieval worked)", resolved.some((c) => !!c.clauseId), `resolved=${resolved.filter((c) => c.clauseId).length}/${resolved.length}`);

  console.log("\n=== RBAC: Viewer cannot upload ===");
  const viewerUp = await uploadStandard(viewer,
    { code: "X", title: "Y", sourceType: "INTERNAL_PROCEDURE" }, "x.pdf", fakePdf("x"));
  assert("Viewer upload -> 403", viewerUp.status === 403, `status=${viewerUp.status}`);

  console.log("\n=== Company isolation: cross-company standard is 404 ===");
  // Create a throwaway company-owned standard, then ensure our company can't read it.
  const otherCompany = await prisma.company.create({ data: { name: `Iso Test ${Date.now()}` } });
  const foreign = await prisma.standard.create({
    data: { companyId: otherCompany.id, code: "FOREIGN", title: "Foreign private standard", sourceType: "INTERNAL_PROCEDURE", isPublic: false },
  });
  const foreignGet = await req("GET", `/api/standards/${foreign.id}`, owner);
  assert("Cross-company standard detail -> 404", foreignGet.status === 404, `status=${foreignGet.status}`);
  const ownerList2 = await req("GET", "/api/standards", owner);
  assert("Foreign standard not in list", !(ownerList2.data?.standards ?? []).some((s: any) => s.id === foreign.id));
  // Cleanup
  await prisma.standard.delete({ where: { id: foreign.id } });
  await prisma.company.delete({ where: { id: otherCompany.id } });

  console.log("\n=== Delete uploaded standard ===");
  const del = await req("DELETE", `/api/standards/${uploadedId}`, owner);
  assert("Delete uploaded standard -> 200", del.status === 200, `status=${del.status}`);
  const afterChunks = await prisma.knowledgeChunk.count({ where: { standardId: uploadedId } });
  assert("Knowledge chunks removed on delete", afterChunks === 0, `chunks=${afterChunks}`);

  console.log("\n=== Audit log ===");
  const logs = await prisma.auditLog.findMany({ where: { action: { in: ["standard.upload", "standard.delete"] } } });
  assert("standard.upload + standard.delete audit logs written", logs.some((l) => l.action === "standard.upload") && logs.some((l) => l.action === "standard.delete"));

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
