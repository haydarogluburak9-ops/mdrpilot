import { PrismaClient, type DeviceClass, type DocStatus, type RiskLevel, type GsprApplicability } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ISO13485_DOCS as FULL_ISO13485_DOCS } from "../src/lib/domain/constants";
import { STANDARDS_SEED } from "./standards-catalog";
import { editionOf, joinStandards } from "../src/lib/domain/standards-catalog";

const prisma = new PrismaClient();

// Demo credentials (documented in README).
const DEMO_EMAIL = "elif@yilmazbio.com";
const DEMO_PASSWORD = "Demo1234!";

const TECH_SECTIONS: [string, string, string][] = [
  ["device-description", "Device Description and Specification", "Annex II 1.1"],
  ["info-supplied", "Information Supplied by the Manufacturer", "Annex II 2"],
  ["design-manufacturing", "Design and Manufacturing Information", "Annex II 3"],
  ["gspr", "General Safety and Performance Requirements", "Annex II 4 / Annex I"],
  ["benefit-risk", "Benefit-Risk Analysis", "Annex II 5"],
  ["risk-management", "Risk Management File", editionOf("ISO 14971")],
  ["verification-validation", "Product Verification and Validation", "Annex II 6.1"],
  ["biocompatibility", "Biocompatibility", "ISO 10993"],
  ["sterilization", "Sterilization Validation", "ISO 11135"],
  ["packaging", "Packaging Validation", "ISO 11607"],
  ["shelf-life", "Shelf Life / Stability", "Annex II 6.1"],
  ["clinical-evaluation", "Clinical Evaluation", "Annex XIV"],
  ["pms-plan", "PMS Plan", "Annex III"],
  ["pmcf-plan", "PMCF Plan", "Annex XIV Part B"],
  ["doc", "Declaration of Conformity", "Annex IV"],
];

const GSPR: [string, string][] = [
  ["1", "Devices shall achieve intended performance and be safe; risks acceptable vs benefits."],
  ["2", "Reduce risks as far as possible (AFAP) without adverse benefit-risk."],
  ["3", "Risk management system established, documented and maintained."],
  ["10.1", "Chemical, physical and biological properties; biocompatibility (ISO 10993)."],
  ["11.2", "Devices in a sterile state - sterilization validation and maintenance."],
  ["11.4", "Sterile devices manufactured and sterilized by validated methods."],
  ["19.1", "Devices with a measuring function - accuracy and limits."],
  ["23.4", "Instructions for use - content requirements."],
];

// Believable starting statuses for the demo company; remaining procedures from
// the full ISO 13485 set default to a rotating status (mostly MISSING/DRAFT).
const ISO13485_DEMO_STATUS: Record<string, DocStatus> = {
  "SOP-DC": "APPROVED",
  "SOP-RC": "APPROVED",
  "SOP-RM": "DRAFT",
  "SOP-CAPA": "IN_REVIEW",
  "SOP-CH": "MISSING",
  "SOP-ST": "DRAFT",
};

const ISO9001_DOCS: [string, string, string, DocStatus][] = [
  ["9001-5.2", "Quality Policy", "5.2", "APPROVED"],
  ["9001-6.2", "Quality Objectives", "6.2", "DRAFT"],
  ["9001-9.3", "Management Review", "9.3", "MISSING"],
];

// Standards Knowledge Base seed catalogue (shared with the non-destructive
// sync script). Paraphrased summaries / clause titles only — no copyrighted text.

function status(i: number): DocStatus {
  return (["APPROVED", "DRAFT", "IN_REVIEW", "MISSING"] as DocStatus[])[i % 4];
}
function riskLevel(s: number, p: number): RiskLevel {
  const v = s * p;
  if (v >= 15) return "CRITICAL";
  if (v >= 9) return "HIGH";
  if (v >= 4) return "MEDIUM";
  return "LOW";
}
const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function reset() {
  // Delete in FK-safe order (children first).
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auditSimFinding.deleteMany();
  await prisma.auditAnswer.deleteMany();
  await prisma.auditQuestion.deleteMany();
  await prisma.auditSession.deleteMany();
  await prisma.qualityManualWizardSession.deleteMany();
  await prisma.aICitation.deleteMany();
  await prisma.knowledgeChunk.deleteMany();
  await prisma.standardClause.deleteMany();
  await prisma.standard.deleteMany();
  await prisma.composerDocumentVersion.deleteMany();
  await prisma.composerDocument.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.exportJob.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.companyInvite.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.technicalFileSection.deleteMany();
  await prisma.gSPRItem.deleteMany();
  await prisma.riskItem.deleteMany();
  await prisma.clinicalEvaluation.deleteMany();
  await prisma.pMSPlan.deleteMany();
  await prisma.pMCFPlan.deleteMany();
  await prisma.iFUDocument.deleteMany();
  await prisma.labelDocument.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.auditFinding.deleteMany();
  await prisma.cAPA.deleteMany();
  await prisma.qMSDocument.deleteMany();
  await prisma.companyMember.deleteMany();
  await prisma.product.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
}

async function main() {
  console.log("Seeding MDRpilot database…");
  await reset();

  // Standards Knowledge Base (public, paraphrased summaries — no copyrighted full text).
  for (const s of STANDARDS_SEED) {
    const std = await prisma.standard.create({
      data: {
        companyId: null, code: s.code, title: s.title, version: s.version,
        sourceType: s.sourceType, jurisdiction: s.jurisdiction, isPublic: true,
      },
    });
    for (const c of s.clauses) {
      await prisma.standardClause.create({
        data: {
          standardId: std.id, clauseNo: c.clauseNo, title: c.title, summary: c.summary,
          keywords: c.keywords, applicability: c.applicability ?? null,
          documentExpectationsJson: c.documentExpectations ?? [],
          evidenceExpectationsJson: c.evidenceExpectations ?? [],
          riskRelevanceJson: c.riskRelevance ?? [],
        },
      });
      await prisma.knowledgeChunk.create({
        data: {
          companyId: null, standardId: std.id, sourceType: s.sourceType,
          title: `${s.code} ${c.clauseNo} — ${c.title}`,
          text: `${s.code} ${c.clauseNo} ${c.title}. ${c.summary} ${(c.documentExpectations ?? []).join(" ")} ${(c.evidenceExpectations ?? []).join(" ")}`.trim(),
          metadataJson: { clauseNo: c.clauseNo, standardCode: s.code },
        },
      });
    }
  }
  const totalClauses = STANDARDS_SEED.reduce((a, s) => a + s.clauses.length, 0);

  const pro = await prisma.subscriptionPlan.upsert({
    where: { key: "pro" },
    update: { name: "Pro", priceMonthly: 750, maxProducts: 5, maxSeats: 5, monthlyAiTokens: 2_500_000 },
    create: { key: "pro", name: "Pro", priceMonthly: 750, maxProducts: 5, maxSeats: 5, monthlyAiTokens: 2_500_000 },
  });
  await prisma.subscriptionPlan.upsert({
    where: { key: "starter" },
    update: { name: "Starter", priceMonthly: 0, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 0 },
    create: { key: "starter", name: "Starter", priceMonthly: 0, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 0 },
  });
  await prisma.subscriptionPlan.upsert({
    where: { key: "basic" },
    update: { name: "Basic", priceMonthly: 250, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 500_000 },
    create: { key: "basic", name: "Basic", priceMonthly: 250, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 500_000 },
  });
  await prisma.subscriptionPlan.upsert({
    where: { key: "plus" },
    update: { name: "Plus", priceMonthly: 450, maxProducts: 3, maxSeats: 3, monthlyAiTokens: 1_500_000 },
    create: { key: "plus", name: "Plus", priceMonthly: 450, maxProducts: 3, maxSeats: 3, monthlyAiTokens: 1_500_000 },
  });
  await prisma.subscriptionPlan.upsert({
    where: { key: "enterprise" },
    update: { name: "Enterprise", priceMonthly: 0, maxProducts: 9999, maxSeats: 9999, monthlyAiTokens: 50_000_000 },
    create: { key: "enterprise", name: "Enterprise", priceMonthly: 0, maxProducts: 9999, maxSeats: 9999, monthlyAiTokens: 50_000_000 },
  });
  await prisma.subscriptionPlan.deleteMany({ where: { key: "free" } }).catch(() => undefined);

  const company = await prisma.company.create({
    data: {
      name: "Yılmaz Bio Medikal",
      legalName: "Yılmaz Bio Medikal San. ve Tic. A.Ş.",
      country: "Türkiye",
      subscriptionId: pro.id,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Dr. Elif Yılmaz",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.companyMember.create({
    data: { companyId: company.id, userId: owner.id, role: "OWNER" },
  });

  // A second user with a different role, same company.
  const qm = await prisma.user.create({
    data: {
      email: "quality@yilmazbio.com",
      name: "Mehmet Demir",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.companyMember.create({
    data: { companyId: company.id, userId: qm.id, role: "QUALITY_MANAGER" },
  });

  // A read-only viewer (can download exports but not create them).
  const viewer = await prisma.user.create({
    data: {
      email: "viewer@yilmazbio.com",
      name: "Ayşe Viewer",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.companyMember.create({
    data: { companyId: company.id, userId: viewer.id, role: "VIEWER" },
  });

  const products: {
    name: string; brand: string; model: string; deviceClass: DeviceClass;
    isSterile: boolean; isInvasive: boolean; hasMeasuringFn: boolean; score: number;
    intendedPurpose: string; materials: string;
  }[] = [
    {
      name: "EO Sterile Ophthalmic Cannula", brand: "OcuFlow", model: "OF-27G",
      deviceClass: "CLASS_IIA", isSterile: true, isInvasive: true, hasMeasuringFn: false, score: 72,
      intendedPurpose: "Single-use cannula for irrigation/aspiration of fluids during ophthalmic surgery.",
      materials: "Stainless steel 316L, medical-grade silicone",
    },
    {
      name: "Single Use Surgical Drapes", brand: "SteriGuard", model: "SG-DRAPE-STD",
      deviceClass: "CLASS_I", isSterile: true, isInvasive: false, hasMeasuringFn: false, score: 58,
      intendedPurpose: "Single-use sterile drape to maintain a sterile field during surgical procedures.",
      materials: "SMS nonwoven polypropylene, PE film, adhesive",
    },
    {
      name: "Ophthalmic Fluid Management Set", brand: "OcuFlow", model: "OF-FMS-100",
      deviceClass: "CLASS_IIB", isSterile: true, isInvasive: true, hasMeasuringFn: true, score: 44,
      intendedPurpose: "Sterile tubing set for controlled delivery and removal of irrigation fluid during ophthalmic surgery.",
      materials: "Medical PVC (DEHP-free), silicone, polycarbonate connectors",
    },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        name: p.name, brand: p.brand, model: p.model, deviceClass: p.deviceClass,
        isSterile: p.isSterile, sterilization: p.isSterile ? "EO" : "NON_STERILE",
        isInvasive: p.isInvasive, hasMeasuringFn: p.hasMeasuringFn,
        intendedPurpose: p.intendedPurpose, materials: p.materials,
        complianceScore: p.score,
        appliedStandards: joinStandards("ISO 14971", "ISO 10993-1", "ISO 11135", "ISO 11607-1", "ISO 15223-1"),
        packagingType: "Double sterile barrier pouch", shelfLife: "3 years",
      },
    });

    await prisma.technicalFileSection.createMany({
      data: TECH_SECTIONS.map(([key, title, annexRef], i) => ({
        productId: product.id, key, title, annexRef, order: i, status: status(i),
        ownerName: i % 2 === 0 ? "Regulatory Affairs" : "Quality Manager",
      })),
    });

    await prisma.gSPRItem.createMany({
      data: GSPR.map(([gsprNo, summary], i) => {
        const hasEvidence = i % 3 !== 0;
        return {
          productId: product.id, gsprNo, requirementSummary: summary,
          applicable: i % 7 === 0 ? "JUSTIFICATION" : "YES",
          evidenceDocument: hasEvidence ? `EV-${gsprNo}.pdf` : null,
          standardReference: i % 2 === 0 ? editionOf("ISO 14971") : editionOf("ISO 10993-1"),
          status: hasEvidence ? (i % 4 === 0 ? "IN_REVIEW" : "APPROVED") : "MISSING",
          aiGapComment: hasEvidence ? null : "No linked evidence found. Attach a test report or rationale.",
        };
      }),
    });

    const risks = [
      ["EO residuals above limit", "Patient exposure to EO/ECH", "Cytotoxic / irritation reaction", 4, 2, "Validated aeration; ISO 10993-7 residual testing", 4, 1],
      ["Loss of sterility", "Compromised sterile barrier", "Infection", 5, 2, "ISO 11607 packaging validation; seal integrity testing", 5, 1],
      ["Tissue trauma", "Incorrect insertion", "Local injury", 3, 3, "Atraumatic design; IFU warnings", 3, 2],
      ["Material biocompatibility", "Prolonged contact", "Irritation / sensitisation", 3, 2, "ISO 10993 biological evaluation", 2, 1],
    ] as const;

    await prisma.riskItem.createMany({
      data: risks.map(([hazard, situation, harm, is, ip, control, rs, rp]) => ({
        productId: product.id, hazard, hazardousSituation: situation, harm,
        initialSeverity: is, initialProbability: ip, initialRiskLevel: riskLevel(is, ip),
        riskControlMeasure: control, residualSeverity: rs, residualProbability: rp,
        residualRiskLevel: riskLevel(rs, rp), verificationOfControl: "Design verification report",
        linkedReferences: "IFU §Warnings; Label",
      })),
    });

    await prisma.pMSPlan.create({ data: { productId: product.id, status: "DRAFT" } });
    await prisma.cAPA.create({
      data: {
        companyId: company.id,
        productId: product.id,
        title: `CAPA — ${p.name} corrective action`,
        status: p.score < 50 ? "OVERDUE" : "OPEN",
        dueDate: daysFromNow(p.score < 50 ? -3 : 12),
        ownerName: "Quality Manager",
      },
    });
  }

  // ---------------- Demo product polish: EO Sterile Ophthalmic Cannula ----------------
  // Deliberate gaps + clear strengths so the pilot demo finds critical issues and a
  // believable readiness story. See README "Demo Mode".
  const eo = await prisma.product.findFirst({
    where: { companyId: company.id, name: "EO Sterile Ophthalmic Cannula" },
    include: { gsprItems: true, technicalSections: true },
  });
  if (eo) {
    const setGspr = async (gsprNo: string, data: { status?: DocStatus; evidenceDocument?: string | null; aiGapComment?: string | null; applicable?: GsprApplicability }) => {
      const item = eo.gsprItems.find((g) => g.gsprNo === gsprNo);
      if (item) await prisma.gSPRItem.update({ where: { id: item.id }, data });
    };
    const setSection = async (key: string, status: DocStatus) => {
      const s = eo.technicalSections.find((t) => t.key === key);
      if (s) await prisma.technicalFileSection.update({ where: { id: s.id }, data: { status } });
    };

    // GAPS
    await setGspr("10.1", { status: "MISSING", evidenceDocument: null, applicable: "YES", aiGapComment: "Biocompatibility (ISO 10993-1) biological evaluation not linked." });
    await setGspr("11.2", { status: "MISSING", evidenceDocument: null, applicable: "YES", aiGapComment: "EO sterilization validation (ISO 11135) evidence missing." });
    await setGspr("11.4", { status: "MISSING", evidenceDocument: null, applicable: "YES", aiGapComment: "EO residual (ISO 10993-7) validation report missing." });
    await setSection("shelf-life", "MISSING"); // shelf-life / stability validation missing
    await setSection("pmcf-plan", "MISSING");

    // STRENGTHS
    await setSection("device-description", "APPROVED");
    await setSection("risk-management", "APPROVED");
    await setSection("gspr", "IN_REVIEW");

    // PMS plan present but weak (DRAFT)
    await prisma.pMSPlan.updateMany({ where: { productId: eo.id }, data: { status: "DRAFT" } });

    // PMCF justification missing
    await prisma.pMCFPlan.create({
      data: { productId: eo.id, status: "MISSING", objective: null, methods: null },
    }).catch(() => undefined);

    // Clinical evaluation partially present
    await prisma.clinicalEvaluation.create({
      data: {
        productId: eo.id, status: "DRAFT",
        plan: "Clinical evaluation planned per MEDDEV 2.7/1 rev 4; equivalence route under assessment.",
        stateOfTheArt: "State-of-the-art review drafted.",
        benefitRiskConclusion: null,
      },
    }).catch(() => undefined);

    // IFU draft present but missing some risk warnings (strength + gap narrative)
    await prisma.iFUDocument.create({
      data: {
        productId: eo.id, version: "v0.9",
        intendedPurpose: eo.intendedPurpose,
        indications: "Irrigation/aspiration during ophthalmic surgery.",
        warnings: "Single use only. Do not reuse.",
        precautions: "Inspect packaging before use.",
        instructions: "Connect to compatible handpiece; prime before use.",
        sterilityInfo: "Sterile (EO). Do not use if package is damaged.",
        symbols: "Single use, Sterile EO, Use-by, LOT, REF, Manufacturer",
        manufacturerInfo: "Yılmaz Bio Medikal San. ve Tic. A.Ş.",
      },
    }).catch(() => undefined);

    // Exactly 2 open CAPAs for the demo product
    await prisma.cAPA.deleteMany({ where: { productId: eo.id } });
    await prisma.cAPA.create({
      data: { companyId: company.id, productId: eo.id, title: "EO residual validation overdue", status: "OVERDUE", dueDate: daysFromNow(-5), ownerName: "Quality Manager", rootCause: "EO aeration validation not completed for new lot configuration." },
    });
    await prisma.cAPA.create({
      data: { companyId: company.id, productId: eo.id, title: "Biocompatibility evidence to be linked", status: "OPEN", dueDate: daysFromNow(14), ownerName: "Regulatory Affairs", rootCause: "ISO 10993 report not yet attached to GSPR 10.1." },
    });

    // One major + one minor audit finding (product-level)
    await prisma.auditFinding.create({
      data: { productId: eo.id, title: "Sterilization validation evidence not available", description: "EO sterilization (ISO 11135) validation evidence could not be located during review.", severity: "MAJOR", clauseRef: "MDR Annex I 11.2", status: "DRAFT" },
    });
    await prisma.auditFinding.create({
      data: { productId: eo.id, title: "IFU missing residual-EO and biocompatibility warnings", description: "Risk-file warnings for EO residuals and material sensitisation are not fully reflected in the IFU.", severity: "MINOR", clauseRef: "MDR Annex I 23.4", status: "DRAFT" },
    });

    // Quality Manual draft (Composer) — a clear strength to show in the demo
    await prisma.composerDocument.create({
      data: {
        companyId: company.id, productId: null, createdById: owner.id,
        title: "Quality Manual (ISO 13485) — Draft", type: "ISO13485_QUALITY_MANUAL", status: "DRAFT", version: 1,
        contentMarkdown: "# Quality Manual\n\n## 1. Scope\nDesign, manufacture and distribution of sterile ophthalmic devices.\n\n## 2. Quality Policy\n[Draft — to be confirmed]\n\n## 3. Process Map\n[Draft]\n",
        aiConfidence: 0.55, disclaimer: "AI-generated draft. Requires review and approval by qualified regulatory/quality personnel.",
      },
    }).catch(() => undefined);
  }

  // Company-level QMS documents
  await prisma.qMSDocument.createMany({
    data: [
      ...FULL_ISO13485_DOCS.map((d, i) => ({
        companyId: company.id, code: d.code, title: d.title, standard: "ISO 13485",
        clauseRefs: d.clauseRefs, status: ISO13485_DEMO_STATUS[d.code] ?? status(i),
        preparedBy: "Quality Manager", version: "REV00",
      })),
      ...ISO9001_DOCS.map(([code, title, clauseRefs, st]) => ({
        companyId: company.id, code, title, standard: "ISO 9001", clauseRefs, status: st,
        preparedBy: "Quality Manager", version: "REV00",
      })),
    ],
  });

  // Uploaded evidence files (metadata only; binary is created via real uploads).
  const firstProduct = await prisma.product.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
    include: {
      gsprItems: { orderBy: { gsprNo: "asc" }, take: 1 },
      technicalSections: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  const biocomp = await prisma.uploadedFile.create({
    data: {
      companyId: company.id, productId: firstProduct?.id ?? null, uploadedById: owner.id,
      originalName: "Biocompatibility_Report_ISO10993.pdf", storedName: "seed-biocomp.pdf",
      fileName: "Biocompatibility_Report_ISO10993.pdf", mimeType: "application/pdf", extension: "pdf",
      sizeBytes: 482000, storageKey: "seed/biocomp.pdf", checksumSha256: "seedbiocompchecksum",
      documentKind: "TEST_REPORT", category: "test-report", analysisStatus: "COMPLETED",
      analysisSummary: "ISO 10993-1 biological evaluation. Supports GSPR 10.1.",
      aiSummary: "ISO 10993-1 biological evaluation. Supports GSPR 10.1.",
    },
  });
  await prisma.uploadedFile.create({
    data: {
      companyId: company.id, productId: firstProduct?.id ?? null, uploadedById: owner.id,
      originalName: "EO_Sterilization_Validation.pdf", storedName: "seed-eo.pdf",
      fileName: "EO_Sterilization_Validation.pdf", mimeType: "application/pdf", extension: "pdf",
      sizeBytes: 1240000, storageKey: "seed/eo.pdf", checksumSha256: "seedeochecksum",
      documentKind: "TEST_REPORT", category: "test-report", analysisStatus: "COMPLETED",
      analysisSummary: "ISO 11135 EO validation. Supports GSPR 11.2/11.4.",
      aiSummary: "ISO 11135 EO validation. Supports GSPR 11.2/11.4.",
    },
  });

  // Demo evidence links so exports show linked evidence out of the box.
  if (firstProduct?.gsprItems[0]) {
    await prisma.gSPREvidenceLink.create({
      data: {
        companyId: company.id, productId: firstProduct.id, gsprItemId: firstProduct.gsprItems[0].id,
        uploadedFileId: biocomp.id, linkedById: owner.id, note: "Biocompatibility evidence (seed).",
      },
    });
  }
  if (firstProduct?.technicalSections[0]) {
    await prisma.technicalFileEvidenceLink.create({
      data: {
        companyId: company.id, productId: firstProduct.id, technicalFileSectionId: firstProduct.technicalSections[0].id,
        uploadedFileId: biocomp.id, linkedById: owner.id, note: "Linked to device description (seed).",
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Company: ${company.name}`);
  console.log(`  Owner login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Quality Manager login: quality@yilmazbio.com / ${DEMO_PASSWORD}`);
  console.log(`  Viewer login: viewer@yilmazbio.com / ${DEMO_PASSWORD}`);
  console.log(`  Products: ${products.length} with full dossiers, QMS docs, CAPAs and files.`);
  console.log(`  Standards: ${STANDARDS_SEED.length} (${totalClauses} clause summaries, paraphrased — no copyrighted text).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
