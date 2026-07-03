/* End-to-end test for the Compliance Consultant + Audit Simulator + Executive modules.
 * Requires the dev server on http://localhost:3000 and a seeded DB. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  assert("Owner/QM/Viewer logged in", owner.cookies.size > 0 && quality.cookies.size > 0 && viewer.cookies.size > 0);

  const company = await prisma.company.findFirst({ where: { name: "Yılmaz Bio Medikal" } });
  const product = await prisma.product.findFirst({ where: { companyId: company!.id, deletedAt: null } });
  assert("Seed product exists", !!product, "no product");
  const productId = product!.id;

  // ---------------- Compliance Consultant ----------------
  console.log("\n=== Compliance Consultant ===");
  const analyze = await req("POST", "/api/consultant/analyze", owner, { productId, standard: "COMBINED" });
  const r = analyze.data?.result;
  assert("Analyze -> 200", analyze.status === 200 && !!r, `status=${analyze.status} ${JSON.stringify(analyze.data)}`);
  assert("overallScore 0-100", typeof r?.overallScore === "number" && r.overallScore >= 0 && r.overallScore <= 100, `score=${r?.overallScore}`);
  assert("categoryScores has 9 keys", r && Object.keys(r.categoryScores).length === 9);
  assert("Gap list produced", Array.isArray(r?.gaps) && r.gaps.length > 0, `gaps=${r?.gaps?.length}`);
  assert("Gap has required fields", !!r?.gaps?.[0]?.severity && !!r.gaps[0].standard && !!r.gaps[0].recommendedAction);
  assert("Top actions produced", Array.isArray(r?.topActions) && r.topActions.length > 0 && r.topActions.length <= 5);
  assert("Roadmap has 4 weeks", Array.isArray(r?.roadmap) && r.roadmap.length === 4, `weeks=${r?.roadmap?.length}`);
  assert("Citations produced (RAG)", Array.isArray(r?.citations) && r.citations.length > 0, `cites=${r?.citations?.length}`);

  const mdr = await req("POST", "/api/consultant/analyze", owner, { productId, standard: "MDR" });
  assert("MDR scope analyze -> 200", mdr.status === 200 && mdr.data.result.standard === "MDR");

  const badStd = await req("POST", "/api/consultant/analyze", owner, { productId, standard: "NOPE" });
  assert("Invalid standard -> 400", badStd.status === 400, `status=${badStd.status}`);

  const noProd = await req("POST", "/api/consultant/analyze", owner, { productId: "does-not-exist", standard: "MDR" });
  assert("Nonexistent product -> 404", noProd.status === 404, `status=${noProd.status}`);

  const viewerAnalyze = await req("POST", "/api/consultant/analyze", viewer, { productId, standard: "MDR" });
  assert("Viewer consultant -> 403", viewerAnalyze.status === 403, `status=${viewerAnalyze.status}`);

  // ---------------- Audit Simulator ----------------
  console.log("\n=== Audit Simulator ===");
  const viewerStart = await req("POST", "/api/audit-simulator", viewer, { standard: "ISO_13485", assessmentType: "QUICK" });
  assert("Viewer cannot start audit -> 403", viewerStart.status === 403, `status=${viewerStart.status}`);

  const start = await req("POST", "/api/audit-simulator", owner, { productId, standard: "ISO_13485", assessmentType: "STANDARD" });
  const sessionId = start.data?.session?.id;
  const questions = start.data?.session?.questions ?? [];
  assert("Start audit -> 200 with questions", start.status === 200 && !!sessionId && questions.length === 10, `q=${questions.length}`);

  // Answer questions: half positive (with evidence), half negative.
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const answerText = i % 2 === 0
      ? "Yes, controlled procedure and records are maintained (SOP and report available)."
      : "No, this is not yet established.";
    await req("PATCH", `/api/audit-simulator/${sessionId}/answer`, owner, { questionId: q.id, answerText });
  }
  const detailMid = await req("GET", `/api/audit-simulator/${sessionId}`, owner);
  assert("Answers persisted", detailMid.status === 200 && detailMid.data.session.questions.every((q: any) => q.answer.length > 0));

  const complete = await req("POST", `/api/audit-simulator/${sessionId}/complete`, owner, {});
  assert("Complete -> 200 with score", complete.status === 200 && typeof complete.data?.score === "number", `status=${complete.status} ${JSON.stringify(complete.data)}`);
  assert("Findings produced", (complete.data?.findingsCount ?? 0) > 0, `count=${complete.data?.findingsCount}`);
  assert("CAPA suggestions produced", (complete.data?.summary?.capaSuggestions?.length ?? 0) > 0);

  const detail = await req("GET", `/api/audit-simulator/${sessionId}`, owner);
  assert("Detail COMPLETED with findings", detail.status === 200 && detail.data.session.status === "COMPLETED" && detail.data.session.findings.length > 0);
  assert("Has major or minor findings", detail.data.session.findings.some((f: any) => f.severity === "MAJOR" || f.severity === "MINOR"));
  assert("Has positive findings", detail.data.session.findings.some((f: any) => f.severity === "POSITIVE"));

  // ---------------- Audit exports ----------------
  console.log("\n=== Audit exports ===");
  for (const fmt of ["pdf", "docx", "findings", "capa"]) {
    const exp = await req("POST", `/api/audit-simulator/${sessionId}/export`, owner, { format: fmt });
    assert(`Export ${fmt} -> COMPLETED`, exp.status === 200 && exp.data?.job?.status === "COMPLETED", `status=${exp.status} ${JSON.stringify(exp.data)}`);
  }
  const exportsList = await req("GET", "/api/exports", owner);
  const auditExports = (exportsList.data?.exports ?? []).filter((e: any) => String(e.type).startsWith("AUDIT_SIM_"));
  assert("Audit exports appear in Export Center", auditExports.length >= 4, `count=${auditExports.length}`);

  // ---------------- RBAC archive ----------------
  console.log("\n=== RBAC ===");
  const viewerArchive = await req("POST", `/api/audit-simulator/${sessionId}/archive`, viewer, {});
  assert("Viewer archive -> 403", viewerArchive.status === 403, `status=${viewerArchive.status}`);
  const ownerArchive = await req("POST", `/api/audit-simulator/${sessionId}/archive`, quality, {});
  assert("Quality Manager archive -> 200", ownerArchive.status === 200, `status=${ownerArchive.status}`);

  // ---------------- Company isolation ----------------
  console.log("\n=== Company isolation ===");
  const otherCompany = await prisma.company.create({ data: { name: "Acme Devices" } });
  const otherUser = await prisma.user.create({ data: { email: `acme-${Date.now()}@x.com`, name: "Acme", passwordHash: await bcrypt.hash("Demo1234!", 12) } });
  await prisma.companyMember.create({ data: { companyId: otherCompany.id, userId: otherUser.id, role: "OWNER" } });
  const otherSession = await prisma.auditSession.create({ data: { companyId: otherCompany.id, standard: "ISO_13485", assessmentType: "QUICK", status: "IN_PROGRESS" } });

  const crossGet = await req("GET", `/api/audit-simulator/${otherSession.id}`, owner);
  assert("Cross-company audit GET -> 404", crossGet.status === 404, `status=${crossGet.status}`);
  const crossExport = await req("POST", `/api/audit-simulator/${otherSession.id}/export`, owner, { format: "pdf" });
  assert("Cross-company audit export -> 404", crossExport.status === 404, `status=${crossExport.status}`);

  // cleanup other company
  await prisma.auditSession.deleteMany({ where: { companyId: otherCompany.id } });
  await prisma.companyMember.deleteMany({ where: { companyId: otherCompany.id } });
  await prisma.user.delete({ where: { id: otherUser.id } });
  await prisma.company.delete({ where: { id: otherCompany.id } });

  // ---------------- Audit log ----------------
  console.log("\n=== Audit log ===");
  const logs = await prisma.auditLog.findMany({ where: { companyId: company!.id, action: { in: ["consultant.analyze", "audit.start", "audit.complete", "audit.archive", "export.create"] } } });
  const actions = new Set(logs.map((l) => l.action));
  assert("consultant.analyze logged", actions.has("consultant.analyze"));
  assert("audit.start logged", actions.has("audit.start"));
  assert("audit.complete logged", actions.has("audit.complete"));
  assert("audit.archive logged", actions.has("audit.archive"));
  assert("export.create logged", actions.has("export.create"));

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
