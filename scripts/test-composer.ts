/* End-to-end test for the AI Document Composer module.
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

async function main() {
  console.log("\n=== Auth ===");
  const owner = await login("elif@yilmazbio.com", "Demo1234!");
  const quality = await login("quality@yilmazbio.com", "Demo1234!");
  const viewer = await login("viewer@yilmazbio.com", "Demo1234!");
  assert("Owner/Quality/Viewer logged in", owner.cookies.size > 0 && quality.cookies.size > 0 && viewer.cookies.size > 0);

  const product = await prisma.product.findFirst({ where: { company: { name: "Yılmaz Bio Medikal" } }, orderBy: { createdAt: "asc" } });
  if (!product) { console.error("No product"); process.exit(1); }

  console.log("\n=== Types ===");
  const types = await req("GET", "/api/composer/types", owner);
  assert("GET /api/composer/types returns 25 types", types.status === 200 && types.data.types.length === 25, `count=${types.data?.types?.length}`);

  console.log("\n=== Generate ===");
  const gen = await req("POST", "/api/composer/generate", owner, { type: "MDR_TECHNICAL_FILE_NARRATIVE", productId: product.id, language: "en" });
  const docId = gen.data?.document?.id;
  assert("Generate (product) -> 201", gen.status === 201 && !!docId, `status=${gen.status} ${JSON.stringify(gen.data)}`);
  assert("Generated markdown not empty", (gen.data?.document?.contentMarkdown?.length ?? 0) > 200);

  const gen2 = await req("POST", "/api/composer/generate", owner, { type: "ISO13485_CAPA_PROCEDURE", language: "tr" });
  const doc2Id = gen2.data?.document?.id;
  assert("Generate (company-level, TR) -> 201", gen2.status === 201 && !!doc2Id, `status=${gen2.status}`);

  const dbDoc = await prisma.composerDocument.findUnique({ where: { id: docId } });
  assert("Analysis JSON persisted", !!dbDoc?.missingInformationJson && !!dbDoc?.complianceGapsJson && !!dbDoc?.evidenceUsedJson);
  const verCount = await prisma.composerDocumentVersion.count({ where: { composerDocumentId: docId } });
  assert("Initial version row created", verCount === 1, `count=${verCount}`);

  console.log("\n=== List + detail ===");
  const list = await req("GET", "/api/composer", owner);
  assert("List returns documents", list.status === 200 && list.data.documents.length >= 2, `count=${list.data?.documents?.length}`);
  const detail = await req("GET", `/api/composer/${docId}`, owner);
  assert("Detail returns markdown + analysis", detail.status === 200 && detail.data.document.contentMarkdown.length > 0 && Array.isArray(detail.data.document.missingInformation));

  console.log("\n=== Update (versioning) ===");
  const patch = await req("PATCH", `/api/composer/${docId}`, owner, { contentMarkdown: detail.data.document.contentMarkdown + "\n\n## Manual addition\nReviewed.", changeSummary: "manual edit" });
  assert("Update -> version 2", patch.status === 200 && patch.data.document.version === 2, `v=${patch.data?.document?.version}`);
  const verCount2 = await prisma.composerDocumentVersion.count({ where: { composerDocumentId: docId } });
  assert("Version row added", verCount2 === 2, `count=${verCount2}`);

  console.log("\n=== Strict workflow ===");
  const badArchive = await req("POST", `/api/composer/${docId}/archive`, quality);
  assert("Archive from DRAFT -> 400", badArchive.status === 400, `status=${badArchive.status}`);
  const badApprove = await req("POST", `/api/composer/${docId}/approve`, quality);
  assert("Approve from DRAFT -> 400", badApprove.status === 400, `status=${badApprove.status}`);
  const badReject = await req("POST", `/api/composer/${docId}/reject`, quality);
  assert("Reject from DRAFT -> 400", badReject.status === 400, `status=${badReject.status}`);

  const submit = await req("POST", `/api/composer/${docId}/submit-review`, owner);
  assert("Submit review -> IN_REVIEW", submit.status === 200 && submit.data.document.status === "IN_REVIEW", `s=${submit.data?.document?.status}`);
  const doubleSubmit = await req("POST", `/api/composer/${docId}/submit-review`, owner);
  assert("Submit twice (IN_REVIEW->IN_REVIEW) -> 400", doubleSubmit.status === 400, `status=${doubleSubmit.status}`);
  const vApprove = await req("POST", `/api/composer/${docId}/approve`, viewer);
  assert("Viewer approve -> 403", vApprove.status === 403, `status=${vApprove.status}`);
  const approve = await req("POST", `/api/composer/${docId}/approve`, quality);
  assert("Quality approve -> APPROVED", approve.status === 200 && approve.data.document.status === "APPROVED", `s=${approve.data?.document?.status}`);
  const approvedDb = await prisma.composerDocument.findUnique({ where: { id: docId }, select: { approvedById: true, approvedAt: true } });
  assert("approvedById/approvedAt set", !!approvedDb?.approvedById && !!approvedDb?.approvedAt);

  console.log("\n=== Approval lock + new revision ===");
  const lockedEdit = await req("PATCH", `/api/composer/${docId}`, owner, { title: "nope" });
  assert("Edit APPROVED -> 400 (locked)", lockedEdit.status === 400, `status=${lockedEdit.status}`);
  const lockedRegen = await req("POST", `/api/composer/${docId}/regenerate`, owner, {});
  assert("Regenerate APPROVED -> 400 (locked)", lockedRegen.status === 400, `status=${lockedRegen.status}`);
  const rev = await req("POST", `/api/composer/${docId}/new-revision`, owner);
  const revId = rev.data?.document?.id;
  assert("New revision -> 201 DRAFT v1, new id", rev.status === 201 && revId && revId !== docId && rev.data.document.status === "DRAFT" && rev.data.document.version === 1, `status=${rev.status}`);
  const approvedStill = await prisma.composerDocument.findUnique({ where: { id: docId }, select: { status: true } });
  assert("Original stays APPROVED (preserved)", approvedStill?.status === "APPROVED", `s=${approvedStill?.status}`);
  const revEdit = await req("PATCH", `/api/composer/${revId}`, owner, { contentMarkdown: "## Revised\nEdited revision." });
  assert("Revision is editable -> v2", revEdit.status === 200 && revEdit.data.document.version === 2, `v=${revEdit.data?.document?.version}`);
  const revRegen = await req("POST", `/api/composer/${revId}/regenerate`, owner, {});
  assert("Revision regenerate -> DRAFT", revRegen.status === 200 && revRegen.data.document.status === "DRAFT");

  console.log("\n=== Reject -> Draft ===");
  const submit2 = await req("POST", `/api/composer/${doc2Id}/submit-review`, owner);
  const reject = await req("POST", `/api/composer/${doc2Id}/reject`, quality);
  assert("Quality reject -> REJECTED", submit2.status === 200 && reject.status === 200 && reject.data.document.status === "REJECTED");
  const editRejected = await req("PATCH", `/api/composer/${doc2Id}`, owner, { contentMarkdown: "## Fixed\nAddressed feedback." });
  assert("Edit REJECTED -> DRAFT", editRejected.status === 200, `status=${editRejected.status}`);
  const rejStatus = await prisma.composerDocument.findUnique({ where: { id: doc2Id }, select: { status: true } });
  assert("REJECTED -> DRAFT after edit", rejStatus?.status === "DRAFT", `s=${rejStatus?.status}`);

  console.log("\n=== Version compare ===");
  const versions = await req("GET", `/api/composer/${revId}/versions`, owner);
  assert("Versions endpoint returns content", versions.status === 200 && versions.data.versions.length >= 2 && typeof versions.data.versions[0].contentMarkdown === "string");

  console.log("\n=== Export via ExportJob ===");
  const exDocx = await req("POST", `/api/composer/${docId}/export`, owner, { format: "docx" });
  const docxJobId = exDocx.data?.job?.id;
  assert("Export DOCX -> 201 ExportJob", exDocx.status === 201 && !!docxJobId && exDocx.data.job.type === "COMPOSER_DOCUMENT_DOCX" && exDocx.data.downloadUrl, `status=${exDocx.status}`);
  const exPdf = await req("POST", `/api/composer/${docId}/export`, owner, { format: "pdf" });
  const pdfJobId = exPdf.data?.job?.id;
  assert("Export PDF -> 201 ExportJob", exPdf.status === 201 && !!pdfJobId && exPdf.data.job.type === "COMPOSER_DOCUMENT_PDF", `status=${exPdf.status}`);

  const expList = await req("GET", "/api/exports", owner);
  const hasComposerExports = expList.data?.exports?.some((e: any) => e.type === "COMPOSER_DOCUMENT_DOCX") && expList.data.exports.some((e: any) => e.type === "COMPOSER_DOCUMENT_PDF");
  assert("Composer exports appear in Export Center", expList.status === 200 && hasComposerExports);

  const dlDocx = await fetch(`${BASE}/api/exports/${docxJobId}/download`, { headers: { Cookie: owner.header() } });
  const docxBuf = Buffer.from(await dlDocx.arrayBuffer());
  assert("Download DOCX from Export Center (PK header)", dlDocx.status === 200 && docxBuf[0] === 0x50 && docxBuf[1] === 0x4b, `status=${dlDocx.status} len=${docxBuf.length}`);
  const dlPdf = await fetch(`${BASE}/api/exports/${pdfJobId}/download`, { headers: { Cookie: owner.header() } });
  const pdfBuf = Buffer.from(await dlPdf.arrayBuffer());
  assert("Download PDF from Export Center (%PDF header)", dlPdf.status === 200 && pdfBuf[0] === 0x25 && pdfBuf[1] === 0x50, `status=${dlPdf.status} len=${pdfBuf.length}`);

  console.log("\n=== RBAC ===");
  const vGen = await req("POST", "/api/composer/generate", viewer, { type: "VIGILANCE_PROCEDURE", language: "en" });
  assert("Viewer generate -> 403", vGen.status === 403, `status=${vGen.status}`);
  const vPatch = await req("PATCH", `/api/composer/${docId}`, viewer, { title: "hack" });
  assert("Viewer update -> 403", vPatch.status === 403, `status=${vPatch.status}`);
  const vList = await req("GET", "/api/composer", viewer);
  assert("Viewer can list (read-only)", vList.status === 200);

  console.log("\n=== Company isolation ===");
  const rnd = Math.floor(Math.random() * 1e6);
  const bJar = new Jar();
  const reg = await fetch(`${BASE}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `c${rnd}@example.com`, password: "Demo1234!", name: "C User" }) });
  bJar.apply(reg);
  await req("POST", "/api/auth/onboarding", bJar, { companyName: `Company C ${rnd}`, country: "TR" });
  const crossGet = await req("GET", `/api/composer/${docId}`, bJar);
  assert("Cross-company detail -> 404", crossGet.status === 404, `status=${crossGet.status}`);
  const crossExport = await fetch(`${BASE}/api/composer/${docId}/export`, { method: "POST", headers: { Cookie: bJar.header(), "Content-Type": "application/json" }, body: JSON.stringify({ format: "pdf" }) });
  assert("Cross-company export -> 404", crossExport.status === 404, `status=${crossExport.status}`);

  console.log("\n=== Audit logs ===");
  for (const a of ["composer.generate", "composer.update", "composer.submit_review", "composer.approve", "composer.reject", "composer.regenerate", "composer.new_revision", "export.create", "export.download"]) {
    const n = await prisma.auditLog.count({ where: { action: a } });
    assert(`AuditLog has ${a}`, n >= 1, `count=${n}`);
  }

  console.log(`\n=== Result: ${pass} passed, ${fail} failed ===`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
