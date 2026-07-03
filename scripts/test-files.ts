/* End-to-end test for File Upload + AI analysis + GSPR/TF/Risk evidence linking.
 * Requires the dev server running on http://localhost:3000 and a seeded DB. */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph } from "docx";
import ExcelJS from "exceljs";

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
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  });
  jar.apply(res);
  return jar;
}

async function jsonReq(method: string, path: string, jar: Jar, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { Cookie: jar.header(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  jar.apply(res);
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

async function uploadFile(jar: Jar, buf: Buffer, name: string, mime: string, productId: string, kind = "TEST_REPORT") {
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buf)], { type: mime }), name);
  fd.append("productId", productId);
  fd.append("documentKind", kind);
  const res = await fetch(`${BASE}/api/files/upload`, { method: "POST", headers: { Cookie: jar.header() }, body: fd });
  jar.apply(res);
  let data: any = null; try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

function makePdf(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.text("Biocompatibility test report per ISO 10993-1. Sterilization EO residuals validated.");
    doc.end();
  });
}

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  console.log("\n=== Auth ===");
  const owner = await login("elif@yilmazbio.com", "Demo1234!");
  assert("Owner login (session cookie)", owner.cookies.size > 0);
  const viewer = await login("viewer@yilmazbio.com", "Demo1234!");
  assert("Viewer login (session cookie)", viewer.cookies.size > 0);

  const product = await prisma.product.findFirst({
    where: { company: { name: "Yılmaz Bio Medikal" } },
    orderBy: { createdAt: "asc" },
    include: { gsprItems: { take: 1, orderBy: { gsprNo: "asc" } }, technicalSections: { take: 1, orderBy: { order: "asc" } }, riskItems: { take: 1 } },
  });
  if (!product) { console.error("No seeded product found"); process.exit(1); }
  const companyId = product.companyId;
  const gsprItemId = product.gsprItems[0].id;
  const sectionId = product.technicalSections[0].id;
  const riskItemId = product.riskItems[0].id;

  console.log("\n=== Upload (Owner) ===");
  const pdfBuf = await makePdf();
  const docxBuf = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Sterilization validation ISO 11135. Packaging ISO 11607.")] }] }));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Data");
  ws.addRow(["Test", "Result"]); ws.addRow(["EO residual", "Pass"]);
  const xlsxBuf = Buffer.from(await wb.xlsx.writeBuffer());

  const up1 = await uploadFile(owner, pdfBuf, "Biocomp_Evidence.pdf", "application/pdf", product.id);
  assert("Upload PDF -> 201", up1.status === 201, `status=${up1.status} ${JSON.stringify(up1.data)}`);
  const pdfFileId = up1.data?.file?.id;
  const up2 = await uploadFile(owner, docxBuf, "Sterilization.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", product.id);
  assert("Upload DOCX -> 201", up2.status === 201, `status=${up2.status}`);
  const up3 = await uploadFile(owner, xlsxBuf, "Residuals.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", product.id);
  assert("Upload XLSX -> 201", up3.status === 201, `status=${up3.status}`);
  const up4 = await uploadFile(owner, PNG_1x1, "Drawing.png", "image/png", product.id, "TECHNICAL_DRAWING");
  assert("Upload PNG -> 201", up4.status === 201, `status=${up4.status}`);

  assert("PDF analysis completed", up1.data?.file?.analysisStatus === "COMPLETED", `status=${up1.data?.file?.analysisStatus}`);

  // Reject an executable / wrong magic file.
  const bad = await uploadFile(owner, Buffer.from("MZ\x90\x00 not a pdf"), "evil.pdf", "application/pdf", product.id);
  assert("Bad magic bytes rejected (400)", bad.status === 400, `status=${bad.status}`);

  console.log("\n=== Private storage ===");
  const dbFile = await prisma.uploadedFile.findUnique({ where: { id: pdfFileId } });
  const uploadsDir = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), "storage", "uploads");
  const onDisk = dbFile?.storageKey ? fs.existsSync(path.join(uploadsDir, dbFile.storageKey)) : false;
  assert("File stored privately under storage/uploads", onDisk, `key=${dbFile?.storageKey}`);

  console.log("\n=== Download ===");
  const dl = await fetch(`${BASE}/api/files/${pdfFileId}/download`, { headers: { Cookie: owner.header() } });
  const dlBuf = Buffer.from(await dl.arrayBuffer());
  assert("Owner downloads PDF -> 200", dl.status === 200 && dlBuf.length > 0 && dlBuf[0] === 0x25, `status=${dl.status} len=${dlBuf.length}`);

  console.log("\n=== List + filter ===");
  const list = await jsonReq("GET", `/api/files?productId=${product.id}`, owner);
  assert("GET /api/files returns uploaded files", list.status === 200 && list.data.files.length >= 4, `count=${list.data?.files?.length}`);
  const kindList = await jsonReq("GET", `/api/files?documentKind=TECHNICAL_DRAWING`, owner);
  assert("Filter by documentKind works", kindList.status === 200 && kindList.data.files.every((f: any) => f.documentKind === "TECHNICAL_DRAWING"));

  console.log("\n=== Re-analyze ===");
  const re = await jsonReq("POST", `/api/files/${pdfFileId}/analyze`, owner);
  assert("Re-analyze -> 200 COMPLETED", re.status === 200 && re.data.file.analysisStatus === "COMPLETED", `status=${re.status}`);

  console.log("\n=== Evidence linking ===");
  const lg = await jsonReq("POST", "/api/evidence/gspr", owner, { gsprItemId, uploadedFileId: pdfFileId, note: "biocomp" });
  assert("Link GSPR evidence -> 201", lg.status === 201, `status=${lg.status} ${JSON.stringify(lg.data)}`);
  const lt = await jsonReq("POST", "/api/evidence/technical-file", owner, { technicalFileSectionId: sectionId, uploadedFileId: pdfFileId });
  assert("Link Technical File evidence -> 201", lt.status === 201, `status=${lt.status}`);
  const lr = await jsonReq("POST", "/api/evidence/risk", owner, { riskItemId, uploadedFileId: pdfFileId });
  assert("Link Risk evidence -> 201", lr.status === 201, `status=${lr.status}`);

  const gsprCount = await prisma.gSPREvidenceLink.count({ where: { companyId, gsprItemId } });
  assert("GSPR evidence link persisted", gsprCount >= 1, `count=${gsprCount}`);

  // Unlink one.
  const unl = await jsonReq("DELETE", `/api/evidence/risk/${lr.data.link.id}`, owner);
  assert("Unlink risk evidence -> 200", unl.status === 200, `status=${unl.status}`);

  console.log("\n=== Export integration ===");
  const exp = await jsonReq("POST", "/api/exports", owner, { type: "GSPR_XLSX", productId: product.id });
  const job = exp.data?.job;
  assert("GSPR XLSX export COMPLETED", exp.status === 201 && job?.status === "COMPLETED", `status=${exp.status}`);
  const expDl = await fetch(`${BASE}/api/exports/${job.id}/download`, { headers: { Cookie: owner.header() } });
  const expBuf = Buffer.from(await expDl.arrayBuffer());
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(expBuf as unknown as ArrayBuffer);
  let evidenceFound = false;
  wb2.eachSheet((sheet) => sheet.eachRow((row) => {
    const text = (row.values as unknown[]).join(" ");
    if (text.includes("Biocomp_Evidence.pdf") || text.includes("Biocompatibility_Report")) evidenceFound = true;
  }));
  assert("GSPR XLSX contains linked evidence filename", evidenceFound);

  const zip = await jsonReq("POST", "/api/exports", owner, { type: "FULL_MDR_TECHNICAL_FILE_ZIP", productId: product.id });
  assert("Full MDR ZIP export COMPLETED", zip.status === 201 && zip.data?.job?.status === "COMPLETED", `status=${zip.status}`);

  console.log("\n=== RBAC ===");
  const vUp = await uploadFile(viewer, pdfBuf, "viewer.pdf", "application/pdf", product.id);
  assert("Viewer upload -> 403", vUp.status === 403, `status=${vUp.status}`);
  const vLink = await jsonReq("POST", "/api/evidence/gspr", viewer, { gsprItemId, uploadedFileId: pdfFileId });
  assert("Viewer link evidence -> 403", vLink.status === 403, `status=${vLink.status}`);
  const vDl = await fetch(`${BASE}/api/files/${pdfFileId}/download`, { headers: { Cookie: viewer.header() } });
  assert("Viewer can download (200)", vDl.status === 200, `status=${vDl.status}`);

  console.log("\n=== Company isolation ===");
  const rnd = Math.floor(Math.random() * 1e6);
  const bJar = new Jar();
  const reg = await fetch(`${BASE}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `b${rnd}@example.com`, password: "Demo1234!", name: "B User" }) });
  bJar.apply(reg);
  const onb = await jsonReq("POST", "/api/auth/onboarding", bJar, { companyName: `Company B ${rnd}`, country: "TR" });
  assert("Company B onboarding 200", onb.status === 200, `status=${onb.status}`);
  const crossDl = await fetch(`${BASE}/api/files/${pdfFileId}/download`, { headers: { Cookie: bJar.header() } });
  assert("Cross-company file download -> 404", crossDl.status === 404, `status=${crossDl.status}`);
  const crossLink = await jsonReq("POST", "/api/evidence/gspr", bJar, { gsprItemId, uploadedFileId: pdfFileId });
  assert("Cross-company evidence link -> 404", crossLink.status === 404, `status=${crossLink.status}`);

  console.log("\n=== Audit logs ===");
  const actions = ["file.upload", "file.download", "file.analyze", "evidence.link", "evidence.unlink"];
  for (const a of actions) {
    const n = await prisma.auditLog.count({ where: { action: a } });
    assert(`AuditLog has ${a}`, n >= 1, `count=${n}`);
  }

  console.log("\n=== Delete (Owner) ===");
  const del = await jsonReq("DELETE", `/api/files/${pdfFileId}`, owner);
  assert("Owner deletes file -> 200", del.status === 200, `status=${del.status}`);
  const delFlag = await prisma.uploadedFile.findUnique({ where: { id: pdfFileId }, select: { deletedAt: true } });
  assert("File soft-deleted", !!delFlag?.deletedAt);
  const fileDelAudit = await prisma.auditLog.count({ where: { action: "file.delete" } });
  assert("AuditLog has file.delete", fileDelAudit >= 1);

  console.log(`\n=== Result: ${pass} passed, ${fail} failed ===`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
