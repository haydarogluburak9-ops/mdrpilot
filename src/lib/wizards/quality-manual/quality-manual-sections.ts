/**
 * Build Quality Manual sections — KEK-01 certified structure.
 * Bölüm 1–3: firma / strateji / tanımlar → Bölüm 4–8: ISO 13485 ana gövde → ekler.
 */

import { isBooleanTrue } from "./steps";
import {
  type KysDocForManual,
  buildDocumentRegisterTable,
  buildProcedureReferenceIndex,
} from "./quality-manual-kys";
import { buildIso13485DetailedClauseSections } from "./iso13485-clause-sections";
import { buildDefinitionsSection } from "./quality-manual-definitions";
import { bi, sectionHeading } from "./quality-manual-bilingual";
import type { QmManualSection } from "./quality-manual-types";

export type { QmManualSection } from "./quality-manual-types";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function boolLabel(v: unknown, locale: "tr" | "en"): string {
  if (isBooleanTrue(v)) return locale === "tr" ? "Evet" : "Yes";
  if (v === false || v === "false" || v === "no") return locale === "tr" ? "Hayır" : "No";
  return "[TO BE CONFIRMED]";
}

export interface BuildQmSectionsOptions {
  bilingual?: boolean;
}

export function buildQualityManualSectionsFromWizard(
  answers: Record<string, unknown>,
  companyName: string,
  locale: "tr" | "en",
  qmsDocCount = 0,
  kysDocs: KysDocForManual[] = [],
  options: BuildQmSectionsOptions = {},
): QmManualSection[] {
  const bilingual = options.bilingual ?? true;
  const tr = locale === "tr";
  const TBC = "[TO BE CONFIRMED]";
  const legal = str(answers.companyLegalName) || companyName;
  const trade = str(answers.tradeName);
  const scope = str(answers.scopeStatement) || str(answers.qmsScope);
  const exclusions = str(answers.exclusionsAndJustifications);
  const sites = str(answers.sites) || str(answers.address);
  const policy = str(answers.qualityPolicyText);
  const history = str(answers.companyHistory);
  const preface = str(answers.manualPreface);
  const contactPerson = str(answers.contactPerson);
  const contactEmail = str(answers.contactEmail);
  const contactPhone = str(answers.contactPhone);
  const mdrRoute = str(answers.mdrConformityRoute);

  const sections: QmManualSection[] = [];

  // ── 1. Firma tanıtım ve kapsam ──────────────────────────────────────────
  const s1IntroTr = `Bu Kalite El Kitabı, ${legal}${trade ? ` (${trade})` : ""} bünyesinde EN ISO 13485:2016+A11:2021 standardında belirtilen kalite yönetim modeline göre kurulan KYS'yi tanıtmak, dokümante etmek ve sürekliliğini sağlamak amacıyla hazırlanmıştır. El kitabı; kalite politikamızın ve referans standardın şartlarının nasıl karşılandığını anlatır. Detaylı uygulama prosedürlerde ve kayıtlarda yer alır.`;
  const s1IntroEn = `This Quality Manual was prepared to introduce, document and ensure continuity of the QMS established at ${legal}${trade ? ` (${trade})` : ""} in accordance with EN ISO 13485:2016+A11:2021. It explains how our quality policy and the requirements of the reference standard are met. Detailed implementation resides in procedures and records.`;

  sections.push({
    heading: sectionHeading("1.", "FİRMA TANITIM VE KAPSAMI", "COMPANY INTRODUCTION AND SCOPE"),
    content: bilingual ? bi(s1IntroTr, s1IntroEn) : (tr ? s1IntroTr : s1IntroEn),
  });

  const historyTr = history || `${legal} kaliteyi yaşam biçimi olarak benimsemiş; teknoloji ve müşteri memnuniyeti odaklı büyümektedir. ${TBC}`;
  const historyEn = history || `${legal} has adopted quality as a way of working and grows with a focus on technology and customer satisfaction. ${TBC}`;
  sections.push({
    heading: sectionHeading("1.1", "Tarihçe", "History"),
    content: bilingual ? bi(historyTr, historyEn) : (tr ? historyTr : historyEn),
    requiresConfirmation: !history,
  });

  const prefaceTr = preface || `El kitabında yazılı hususların doğruluğunu, geçerliliğini ve kuruluş ilkelerimize uygunluğunu onaylarız; gereken tüm faaliyetlerin yapılmasını personelimizle birlikte taahhüt ederiz. ${TBC}`;
  const prefaceEn = preface || `We confirm the accuracy, validity and compliance of all matters stated in this manual with our organization principles and undertake to carry out all necessary activities together with our personnel. ${TBC}`;
  sections.push({
    heading: sectionHeading("1.2", "Önsöz", "Preface"),
    content: bilingual ? bi(prefaceTr, prefaceEn) : (tr ? prefaceTr : prefaceEn),
    requiresConfirmation: !preface,
  });

  const commTr = [
    sites && `Adres: ${sites}`,
    contactPerson && `İletişim kişisi: ${contactPerson}`,
    contactEmail && `E-posta: ${contactEmail}`,
    contactPhone && `Telefon: ${contactPhone}`,
  ].filter(Boolean).join("\n") || TBC;
  const commEn = [
    sites && `Address: ${sites}`,
    contactPerson && `Contact person: ${contactPerson}`,
    contactEmail && `E-mail: ${contactEmail}`,
    contactPhone && `Phone: ${contactPhone}`,
  ].filter(Boolean).join("\n") || TBC;
  sections.push({
    heading: sectionHeading("1.3", "İletişim", "Communication"),
    content: bilingual ? bi(commTr, commEn) : (tr ? commTr : commEn),
    requiresConfirmation: !sites,
  });

  const scopeTr = `KYS kapsamı: ${scope || TBC}.\nÜrün grupları: ${str(answers.productGroups) || str(answers.productFamilies) || TBC}.\nPazarlar: ${str(answers.regulatoryMarkets) || TBC}.\nGeçerli standartlar: ${str(answers.applicableStandards) || "EN ISO 13485:2016+A11:2021"}.\nTıbbi cihaz dosyası: ${str(answers.medicalDeviceFileScope) || TBC}.\nMDR uygunluk rotası: ${mdrRoute || TBC}.`;
  const scopeEn = `QMS scope: ${scope || TBC}.\nProduct groups: ${str(answers.productGroups) || str(answers.productFamilies) || TBC}.\nMarkets: ${str(answers.regulatoryMarkets) || TBC}.\nApplicable standards: ${str(answers.applicableStandards) || "EN ISO 13485:2016+A11:2021"}.\nMedical device file: ${str(answers.medicalDeviceFileScope) || TBC}.\nMDR conformity route: ${mdrRoute || TBC}.`;
  sections.push({
    heading: sectionHeading("1.4", "Kapsam", "Scope"),
    content: bilingual ? bi(scopeTr, scopeEn) : (tr ? scopeTr : scopeEn),
    requiresConfirmation: !scope,
  });

  const exclTr = `Hariç tutmalar ve gerekçeler: ${exclusions || TBC}.\nTasarım/geliştirme: ${boolLabel(answers.designAndDevelopmentIncluded, "tr")}.\nSteril ürünler: ${boolLabel(answers.sterileProductsIncluded, "tr")}.\nYalnızca dağıtım: ${boolLabel(answers.distributionOnly, "tr")}.`;
  const exclEn = `Exclusions and justifications: ${exclusions || TBC}.\nDesign & development: ${boolLabel(answers.designAndDevelopmentIncluded, "en")}.\nSterile products: ${boolLabel(answers.sterileProductsIncluded, "en")}.\nDistribution only: ${boolLabel(answers.distributionOnly, "en")}.`;
  sections.push({
    heading: sectionHeading("1.5", "Kapsam Dışı Maddeler", "Excluded Substances / Scope Exclusions"),
    content: bilingual ? bi(exclTr, exclEn) : (tr ? exclTr : exclEn),
  });

  // ── 2. Kalite yönetim stratejisi ────────────────────────────────────────
  const defaultPolicyTr = `Yaptığımız işin kalitesi ve müşteri memnuniyeti başarımızın sürekliliğinin anahtarıdır. Müşteri ihtiyaçlarına en uygun şekilde cevap verebilmek için gerekli tüm tedbirleri alırız. Sürekli iyileştirme ve mevzuata uygunluk taahhüdümüzdür.`;
  const defaultPolicyEn = `The quality of our work and customer satisfaction are key to the continuity of our success. We take all necessary precautions to respond appropriately to customer needs. Continual improvement and regulatory compliance are our commitment.`;
  const policyTr = policy || defaultPolicyTr;
  const policyEn = policy || defaultPolicyEn;
  const stratIntroTr = `Kalite yönetim stratejimiz; müşteri odaklılık, sürekli iyileştirme ve düzenleyici uygunluk üzerine kuruludur.`;
  const stratIntroEn = `Our quality management strategy is built on customer focus, continual improvement and regulatory compliance.`;
  sections.push({
    heading: sectionHeading("2.", "KALİTE YÖNETİM STRATEJİSİ", "QUALITY MANAGEMENT STRATEGY"),
    content: bilingual ? bi(stratIntroTr, stratIntroEn) : (tr ? stratIntroTr : stratIntroEn),
  });

  sections.push({
    heading: sectionHeading("2.1", "Kalite Politikası", "Quality Policy"),
    content: bilingual ? bi(policyTr, policyEn) : (tr ? policyTr : policyEn),
    requiresConfirmation: !policy,
  });

  if (str(answers.organizationChartText) || str(answers.organizationRolesMatrixText)) {
    const orgTr = [
      str(answers.organizationChartText) && `Organizasyon şeması:\n${str(answers.organizationChartText).slice(0, 3500)}`,
      str(answers.organizationRolesMatrixText) && `Roller ve sorumluluklar:\n${str(answers.organizationRolesMatrixText).slice(0, 5000)}`,
    ].filter(Boolean).join("\n\n");
    const orgEn = [
      str(answers.organizationChartText) && `Organization chart:\n${str(answers.organizationChartText).slice(0, 3500)}`,
      str(answers.organizationRolesMatrixText) && `Roles and responsibilities:\n${str(answers.organizationRolesMatrixText).slice(0, 5000)}`,
    ].filter(Boolean).join("\n\n");
    sections.push({
      heading: sectionHeading("2.2", "Organizasyon Şeması", "Organization Chart"),
      content: bilingual ? bi(orgTr, orgEn) : (tr ? orgTr : orgEn),
    });
  } else {
    const rolesTr = `Genel müdür: ${str(answers.generalManager) || TBC}.\nYönetim temsilcisi: ${str(answers.managementRepresentative) || TBC}.\nKalite müdürü: ${str(answers.qualityManager) || TBC}.\nDüzenleyici sorumlu: ${str(answers.regulatoryResponsible) || TBC}.\nÜretim: ${str(answers.productionResponsible) || TBC}.`;
    const rolesEn = `General manager: ${str(answers.generalManager) || TBC}.\nManagement representative: ${str(answers.managementRepresentative) || TBC}.\nQuality manager: ${str(answers.qualityManager) || TBC}.\nRegulatory responsible: ${str(answers.regulatoryResponsible) || TBC}.\nProduction: ${str(answers.productionResponsible) || TBC}.`;
    sections.push({
      heading: sectionHeading("2.2", "Organizasyon Şeması ve Roller", "Organization Chart and Roles"),
      content: bilingual ? bi(rolesTr, rolesEn) : (tr ? rolesTr : rolesEn),
      requiresConfirmation: !str(answers.qualityManager),
    });
  }

  // ── 3. Tanımlar ─────────────────────────────────────────────────────────
  sections.push(buildDefinitionsSection(bilingual));

  // ── 4–8. ISO 13485 ana gövde (süreç haritası ISO 4.1.2'de referans) ───
  const processNoteTr = `Temel süreçler: ${str(answers.coreProcesses) || TBC}.\nDestek süreçleri: ${str(answers.supportProcesses) || TBC}.\nYönetim süreçleri: ${str(answers.managementProcesses) || TBC}.\nSüreç etkileşimleri: ${str(answers.processInteractions) || TBC}.\nAna KPI'lar: ${str(answers.keyProcessKPIs) || TBC}.`;
  const processNoteEn = `Core processes: ${str(answers.coreProcesses) || TBC}.\nSupport processes: ${str(answers.supportProcesses) || TBC}.\nManagement processes: ${str(answers.managementProcesses) || TBC}.\nProcess interactions: ${str(answers.processInteractions) || TBC}.\nKey KPIs: ${str(answers.keyProcessKPIs) || TBC}.`;
  sections.push({
    heading: sectionHeading("—", "Süreç Haritası (ISO 4.1.2 referansı)", "Process Map (reference for ISO 4.1.2)"),
    content: bilingual ? bi(processNoteTr, processNoteEn) : (tr ? processNoteTr : processNoteEn),
    requiresConfirmation: !str(answers.coreProcesses),
  });

  sections.push(...buildIso13485DetailedClauseSections(answers, locale, companyName, qmsDocCount, { bilingual }));

  // ── Ekler ───────────────────────────────────────────────────────────────
  const procedureIndex = buildProcedureReferenceIndex(answers, kysDocs, locale);
  const procIntroTr = `Kalite el kitabı üst düzey KYS tanımıdır; prosedür metinlerini birebir içermez. Kontrollü prosedür metinleri yalnızca KYS kayıt defterindedir (${qmsDocCount} kayıt).`;
  const procIntroEn = `The quality manual is a high-level QMS description; it does not reproduce procedure text verbatim. Controlled procedure texts are maintained only in the QMS register (${qmsDocCount} documents).`;
  sections.push({
    heading: sectionHeading("Ek A", "Dokümante Edilmiş Prosedür Referansları", "Documented Procedure References"),
    content: bilingual
      ? bi(`${procIntroTr}\n\n${procedureIndex}`, `${procIntroEn}\n\n${procedureIndex}`)
      : `${tr ? procIntroTr : procIntroEn}\n\n${procedureIndex}`,
  });

  if (kysDocs.length > 0) {
    const regTr = `KYS'de kayıtlı ${kysDocs.length} doküman. Revizyon durumu KYS'de izlenir.\n\n${buildDocumentRegisterTable(kysDocs, locale)}`;
    const regEn = `${kysDocs.length} documents in the QMS register. Revision status is tracked in KYS.\n\n${buildDocumentRegisterTable(kysDocs, locale)}`;
    sections.push({
      heading: sectionHeading("Ek B", "KYS Kayıt Defteri Özeti", "QMS Document Register Summary"),
      content: bilingual ? bi(regTr, regEn) : (tr ? regTr : regEn),
    });
  }

  const refsTr = `EN ISO 13485:2016+A11:2021; ISO 14971; MDR 2017/745; ISO 15223-1; geçerli TİTCK gereklilikleri.\nUygulanan standartlar: ${str(answers.applicableStandards) || TBC}.\nMevzuat: ${str(answers.applicableRegulations) || TBC}.`;
  const refsEn = `EN ISO 13485:2016+A11:2021; ISO 14971; MDR 2017/745; ISO 15223-1; applicable TİTCK requirements.\nApplied standards: ${str(answers.applicableStandards) || TBC}.\nRegulations: ${str(answers.applicableRegulations) || TBC}.`;
  sections.push({
    heading: sectionHeading("Ek C", "Regülasyon ve Standart Referansları", "Regulatory and Standard References"),
    content: bilingual ? bi(refsTr, refsEn) : (tr ? refsTr : refsEn),
  });

  return sections;
}

/** Cover block markdown prepended to QM Word export. */
export function buildQualityManualCoverMarkdown(
  answers: Record<string, unknown>,
  companyName: string,
  bilingual: boolean,
): string {
  const legal = str(answers.companyLegalName) || companyName;
  const sites = str(answers.sites) || str(answers.address) || "[TO BE CONFIRMED]";
  const tr = `**YÖNETİM SİSTEMİ EL KİTABI**\n\n**${legal}**\n\nDoküman No: QM-01\nStandart: EN ISO 13485:2016+A11:2021\n\n${sites}\n\n> KONTROLLÜ KOPYA / CONTROLLED COPY\n> Bu el kitabı ${legal} kuruluşuna aittir. Kontrolsüz kopyalar bilgi amaçlıdır.`;
  const en = `**MANAGEMENT SYSTEM MANUAL**\n\n**${legal}**\n\nDocument No: QM-01\nStandard: EN ISO 13485:2016+A11:2021\n\n${sites}\n\n> CONTROLLED COPY\n> This manual belongs to ${legal}. Uncontrolled copies are for information only.`;
  return bilingual ? bi(tr, en) : tr;
}
