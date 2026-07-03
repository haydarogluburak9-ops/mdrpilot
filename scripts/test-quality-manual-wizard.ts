/* End-to-end test for the Quality Manual Wizard module.
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
  const viewer = await login("viewer@yilmazbio.com", "Demo1234!");
  assert("Owner + Viewer logged in", owner.cookies.size > 0 && viewer.cookies.size > 0);

  console.log("\n=== Create session ===");
  const created = await req("POST", "/api/wizards/quality-manual", owner, { standardMode: "BOTH" });
  const id = created.data?.session?.id;
  assert("Create -> 201", created.status === 201 && !!id, `status=${created.status} ${JSON.stringify(created.data)}`);

  const badMode = await req("POST", "/api/wizards/quality-manual", owner, { standardMode: "NOPE" });
  assert("Invalid standardMode -> 400", badMode.status === 400, `status=${badMode.status}`);

  console.log("\n=== RBAC: Viewer cannot create / update / generate ===");
  const viewerCreate = await req("POST", "/api/wizards/quality-manual", viewer, { standardMode: "ISO_13485" });
  assert("Viewer create -> 403", viewerCreate.status === 403, `status=${viewerCreate.status}`);
  const viewerPatch = await req("PATCH", `/api/wizards/quality-manual/${id}`, viewer, { answers: { x: 1 } });
  assert("Viewer update -> 403", viewerPatch.status === 403, `status=${viewerPatch.status}`);
  const viewerGen = await req("POST", `/api/wizards/quality-manual/${id}/generate`, viewer, {});
  assert("Viewer generate -> 403", viewerGen.status === 403, `status=${viewerGen.status}`);

  console.log("\n=== Save answers (partial → triggers gaps) ===");
  const patch1 = await req("PATCH", `/api/wizards/quality-manual/${id}`, owner, {
    answers: {
      companyLegalName: "Yılmaz Bio Medikal A.Ş.",
      scopeStatement: "Design, manufacture and distribution of sterile ophthalmic devices.",
      qmsScope: "Covers design, production, sterilization and distribution.",
      designAndDevelopmentIncluded: "yes",
      sterileProductsIncluded: "yes",
      sterilizationMethod: "EO",
      coreProcesses: "Design, production, sterilization, distribution",
      managementRepresentative: "Mehmet Demir",
      qualityManager: "Mehmet Demir",
    },
    currentStep: 5,
  });
  assert("Patch -> 200 step 5", patch1.status === 200 && patch1.data.session.currentStep === 5, `status=${patch1.status}`);
  const detail1 = await req("GET", `/api/wizards/quality-manual/${id}`, owner);
  assert("Detail persists answers", detail1.status === 200 && detail1.data.session.answers.companyLegalName?.includes("Yılmaz"));

  console.log("\n=== Gap check finds critical gaps ===");
  const gap1 = await req("POST", `/api/wizards/quality-manual/${id}/gap-check`, owner);
  assert("Gap-check -> 200", gap1.status === 200);
  const g = gap1.data?.gap;
  assert("Critical gaps produced (missing procedures)", (g?.criticalGaps?.length ?? 0) > 0, `count=${g?.criticalGaps?.length}`);
  assert("Sterilization procedure gap detected", g.criticalGaps.some((x: string) => /steriliz/i.test(x)), JSON.stringify(g.criticalGaps));
  assert("Document/record control gap detected", g.criticalGaps.some((x: string) => /document control|record control/i.test(x)));
  assert("Applicable clauses retrieved (RAG)", (g?.applicableClauses?.length ?? 0) > 0, `count=${g?.applicableClauses?.length}`);
  assert("Not ready to generate with gaps", g.readyToGenerate === false);
  const sess1 = await prisma.qualityManualWizardSession.findUnique({ where: { id } });
  assert("Session status GAP_CHECKED", sess1?.status === "GAP_CHECKED", `status=${sess1?.status}`);

  console.log("\n=== Complete remaining critical fields ===");
  await req("PATCH", `/api/wizards/quality-manual/${id}`, owner, {
    answers: {
      documentControlProcedureCode: "SOP-DC", recordControlProcedureCode: "SOP-RC",
      capaProcedureCode: "SOP-CAPA", complaintProcedureCode: "SOP-CH",
      internalAuditProcedureCode: "SOP-IA", managementReviewProcedureCode: "SOP-MR",
      sterilizationProcedureCode: "SOP-ST",
      complaintHandlingMethod: "Logged, evaluated and investigated within defined timelines.",
      pmsMethod: "Proactive and reactive PMS with trend analysis.",
      capaMethod: "Root-cause analysis with effectiveness checks.",
    },
    currentStep: 9,
  });
  const gap2 = await req("POST", `/api/wizards/quality-manual/${id}/gap-check`, owner);
  assert("Gap-check after completion -> ready", gap2.status === 200 && gap2.data.gap.readyToGenerate === true, `gaps=${JSON.stringify(gap2.data?.gap?.criticalGaps)}`);

  console.log("\n=== Generate ComposerDocument ===");
  const gen = await req("POST", `/api/wizards/quality-manual/${id}/generate`, owner, { language: "en" });
  const docId = gen.data?.composerDocumentId;
  assert("Generate -> 201", gen.status === 201 && !!docId, `status=${gen.status} ${JSON.stringify(gen.data)}`);

  const doc = await prisma.composerDocument.findUnique({ where: { id: docId } });
  assert("ComposerDocument created as quality manual", !!doc && doc.type === "ISO13485_QUALITY_MANUAL", `type=${doc?.type}`);
  assert("Markdown has Regulatory References", (doc?.contentMarkdown ?? "").includes("Regulatory References"));
  const snapshot = doc?.sourceSnapshotJson as any;
  assert("sourceSnapshotJson contains wizard answers", !!snapshot?.qualityManualWizard?.answers?.companyLegalName, JSON.stringify(Object.keys(snapshot ?? {})));
  assert("Composer document has citations", (await prisma.aICitation.count({ where: { targetType: "COMPOSER_DOCUMENT", targetId: docId } })) > 0);

  const sess2 = await prisma.qualityManualWizardSession.findUnique({ where: { id } });
  assert("Session GENERATED + linked + generatedAt", sess2?.status === "GENERATED" && sess2?.composerDocumentId === docId && !!sess2?.generatedAt);

  console.log("\n=== Generated session is locked ===");
  const patchAfter = await req("PATCH", `/api/wizards/quality-manual/${id}`, owner, { answers: { x: 1 } });
  assert("Update after generate -> 400", patchAfter.status === 400, `status=${patchAfter.status}`);

  console.log("\n=== ISO 9001 mode generates ISO 9001 manual ===");
  const s9001 = await req("POST", "/api/wizards/quality-manual", owner, { standardMode: "ISO_9001" });
  const id9001 = s9001.data.session.id;
  await req("PATCH", `/api/wizards/quality-manual/${id9001}`, owner, {
    answers: {
      companyLegalName: "Yılmaz Bio", scopeStatement: "Manufacture of devices.",
      qmsScope: "QMS covers manufacturing.", coreProcesses: "Production",
      managementRepresentative: "MD", qualityManager: "MD",
      documentControlProcedureCode: "SOP-DC", recordControlProcedureCode: "SOP-RC",
      capaProcedureCode: "SOP-CAPA", complaintProcedureCode: "SOP-CH",
      internalAuditProcedureCode: "SOP-IA", managementReviewProcedureCode: "SOP-MR",
      complaintHandlingMethod: "Defined.", pmsMethod: "Defined.", capaMethod: "Defined.",
    },
  });
  const gen9001 = await req("POST", `/api/wizards/quality-manual/${id9001}/generate`, owner, { language: "en" });
  const doc9001 = await prisma.composerDocument.findUnique({ where: { id: gen9001.data?.composerDocumentId } });
  assert("ISO 9001 mode -> ISO9001_QUALITY_MANUAL", doc9001?.type === "ISO9001_QUALITY_MANUAL", `type=${doc9001?.type}`);

  console.log("\n=== List ===");
  const list = await req("GET", "/api/wizards/quality-manual", owner);
  assert("List returns sessions", list.status === 200 && list.data.sessions.length >= 2, `count=${list.data?.sessions?.length}`);

  console.log("\n=== Archive (QM+) ===");
  const quality = await login("quality@yilmazbio.com", "Demo1234!");
  const consultantArchiveBlocked = await req("POST", `/api/wizards/quality-manual/${id9001}/archive`, viewer);
  assert("Viewer archive -> 403", consultantArchiveBlocked.status === 403, `status=${consultantArchiveBlocked.status}`);
  const arch = await req("POST", `/api/wizards/quality-manual/${id9001}/archive`, quality);
  assert("QM archive -> 200", arch.status === 200 && arch.data.session.status === "ARCHIVED", `status=${arch.status}`);

  console.log("\n=== Company isolation ===");
  const otherCompany = await prisma.company.create({ data: { name: `QM Test ${Date.now()}` } });
  const foreign = await prisma.qualityManualWizardSession.create({ data: { companyId: otherCompany.id, standardMode: "ISO_13485", status: "DRAFT" } });
  const foreignGet = await req("GET", `/api/wizards/quality-manual/${foreign.id}`, owner);
  assert("Cross-company session detail -> 404", foreignGet.status === 404, `status=${foreignGet.status}`);
  const foreignPatch = await req("PATCH", `/api/wizards/quality-manual/${foreign.id}`, owner, { answers: { x: 1 } });
  assert("Cross-company patch -> 404", foreignPatch.status === 404, `status=${foreignPatch.status}`);
  await prisma.qualityManualWizardSession.delete({ where: { id: foreign.id } });
  await prisma.company.delete({ where: { id: otherCompany.id } });

  console.log("\n=== Audit log ===");
  const actions = ["wizard.quality_manual.create", "wizard.quality_manual.update", "wizard.quality_manual.gap_check", "wizard.quality_manual.generate", "wizard.quality_manual.archive"];
  const logs = await prisma.auditLog.findMany({ where: { action: { in: actions } } });
  for (const a of actions) assert(`AuditLog has ${a}`, logs.some((l) => l.action === a));

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
