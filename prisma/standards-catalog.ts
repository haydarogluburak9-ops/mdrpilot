// Standards Knowledge Base catalogue (shared by the full seed and the
// non-destructive sync script).
// IMPORTANT (copyright): These are short PARAPHRASED summaries and clause titles
// only. No verbatim ISO/IEC standard text is stored. MDR and MDCG entries
// reference public EU regulation and guidance.

export type ClauseSeed = {
  clauseNo: string;
  title: string;
  summary: string;
  keywords: string;
  applicability?: string;
  documentExpectations?: string[];
  evidenceExpectations?: string[];
  riskRelevance?: string[];
};

export type StandardSeed = {
  code: string;
  title: string;
  version: string;
  sourceType: "PUBLIC_REGULATION" | "TEMPLATE_SUMMARY";
  jurisdiction: string;
  clauses: ClauseSeed[];
};

export const STANDARDS_SEED: StandardSeed[] = [
  {
    code: "ISO 13485", title: "Medical devices — Quality management systems (summary)", version: "2016",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "4.2.3", title: "Medical Device File", summary: "Establish and maintain a file per device type/family demonstrating conformity and QMS requirements.", keywords: "medical device file, technical documentation, conformity", documentExpectations: ["Medical Device File index", "Device description and specification"], evidenceExpectations: ["Approved technical file sections"], riskRelevance: ["Incomplete file undermines conformity demonstration"] },
      { clauseNo: "4.2.4", title: "Control of Documents", summary: "Control documents required by the QMS: approval, review, versioning and availability.", keywords: "document control, approval, version, revision", documentExpectations: ["Document Control Procedure"], evidenceExpectations: ["Approved, version-controlled procedures"] },
      { clauseNo: "7.3", title: "Design and Development", summary: "Plan and control design: inputs, outputs, review, verification, validation and transfer.", keywords: "design, development, verification, validation, design history", documentExpectations: ["Design & development plan", "Design history file"], evidenceExpectations: ["Verification & validation reports"] },
      { clauseNo: "7.5.7", title: "Validation of sterilization processes", summary: "Validate and routinely control sterilization and sterile barrier processes.", keywords: "sterilization, sterile barrier, validation, EO, gamma", documentExpectations: ["Sterilization Control Procedure"], evidenceExpectations: ["Sterilization validation report (ISO 11135/11137)"], riskRelevance: ["Loss of sterility, infection"] },
      { clauseNo: "8.2.2", title: "Complaint handling", summary: "Document procedures for timely complaint receipt, evaluation and investigation.", keywords: "complaint, feedback, investigation, vigilance", documentExpectations: ["Complaint Handling Procedure"], evidenceExpectations: ["Complaint records"] },
      { clauseNo: "8.5.2", title: "Corrective action", summary: "Take corrective action to eliminate causes of nonconformities and prevent recurrence.", keywords: "capa, corrective action, nonconformity, root cause", documentExpectations: ["CAPA Procedure"], evidenceExpectations: ["CAPA records with effectiveness checks"] },
    ],
  },
  {
    code: "ISO 9001", title: "Quality management systems — Requirements (summary)", version: "2015",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "4.4", title: "QMS and its processes", summary: "Determine processes, their interactions, criteria, resources and responsibilities.", keywords: "process approach, qms, interactions", documentExpectations: ["Process map"], evidenceExpectations: ["Process KPIs"] },
      { clauseNo: "6.1", title: "Actions to address risks and opportunities", summary: "Plan actions to address risks and opportunities relevant to the QMS.", keywords: "risk, opportunity, planning", documentExpectations: ["Risk & opportunity register"] },
      { clauseNo: "9.3", title: "Management review", summary: "Top management reviews the QMS at planned intervals for suitability and effectiveness.", keywords: "management review, top management, effectiveness", documentExpectations: ["Management Review Procedure"], evidenceExpectations: ["Management review minutes"] },
    ],
  },
  {
    code: "MDR 2017/745", title: "EU Medical Device Regulation (public regulation references)", version: "2017/745",
    sourceType: "PUBLIC_REGULATION", jurisdiction: "European Union",
    clauses: [
      { clauseNo: "Annex II 1.1", title: "Device description and specification", summary: "Technical documentation shall include device description, variants, intended purpose and specifications.", keywords: "device description, intended purpose, specification, variants, udi", documentExpectations: ["Device description and specification"], evidenceExpectations: ["Approved device description section"], riskRelevance: ["Misidentification, incorrect use"] },
      { clauseNo: "Annex I 10.1", title: "Chemical, physical and biological properties", summary: "Address biocompatibility and material safety for body-contacting devices.", keywords: "biocompatibility, biological, material, iso 10993, chemical", applicability: "Body-contacting devices", documentExpectations: ["Biological evaluation plan/report"], evidenceExpectations: ["ISO 10993 biological evaluation"], riskRelevance: ["Cytotoxicity, sensitisation, irritation"] },
      { clauseNo: "Annex I 11.2", title: "Devices in a sterile state", summary: "Sterile devices shall be manufactured and sterilized by validated methods, maintaining sterility.", keywords: "sterile, sterilization, sterile barrier, validation, eo", applicability: "Sterile devices", documentExpectations: ["Sterilization validation plan"], evidenceExpectations: ["ISO 11135 EO validation", "ISO 11607 packaging validation"], riskRelevance: ["Loss of sterility, infection"] },
      { clauseNo: "Annex I 23", title: "Label and instructions for use", summary: "Provide label and IFU information needed for safe use, including symbols and UDI.", keywords: "label, ifu, instructions for use, symbols, udi, warnings", documentExpectations: ["IFU", "Label artwork"], evidenceExpectations: ["IFU/label aligned with risk file"], riskRelevance: ["Use error, missing warnings"] },
      { clauseNo: "Annex III", title: "Post-market surveillance technical documentation", summary: "Maintain a PMS plan, PMS report / PSUR proportionate to device class.", keywords: "pms, post-market surveillance, psur, trend", documentExpectations: ["PMS Plan"], evidenceExpectations: ["PMS report / PSUR"] },
      { clauseNo: "Annex XIV", title: "Clinical evaluation and PMCF", summary: "Conduct and document clinical evaluation and plan PMCF.", keywords: "clinical evaluation, cer, pmcf, clinical data, equivalence", documentExpectations: ["Clinical Evaluation Plan/Report"], evidenceExpectations: ["Clinical evaluation report", "PMCF plan"] },
    ],
  },
  {
    code: "ISO 14971", title: "Application of risk management to medical devices (summary)", version: "2019",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 5", title: "Risk analysis", summary: "Identify hazards, hazardous situations and estimate associated risks.", keywords: "risk analysis, hazard, hazardous situation, estimation", documentExpectations: ["Risk analysis / FMEA"], evidenceExpectations: ["Hazard identification records"] },
      { clauseNo: "Clause 7-8", title: "Risk control and residual risk", summary: "Implement risk controls, verify implementation/effectiveness and evaluate residual risk.", keywords: "risk control, residual risk, verification, mitigation", documentExpectations: ["Risk control measures"], evidenceExpectations: ["Verification of risk controls"], riskRelevance: ["Unacceptable residual risk"] },
      { clauseNo: "Clause 10", title: "Production and post-production activities", summary: "Collect and review production and post-production information to update the risk file.", keywords: "post-production, monitoring, feedback, update", documentExpectations: ["Production/post-production review"], evidenceExpectations: ["Updated risk management report"] },
    ],
  },
  {
    code: "ISO 10993-1", title: "Biological evaluation of medical devices — Part 1 (summary)", version: "2018",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 4-6", title: "Biological evaluation within risk management", summary: "Plan biological evaluation based on nature and duration of body contact, within the ISO 14971 risk process.", keywords: "biocompatibility, biological evaluation, body contact, risk", applicability: "Body-contacting devices", documentExpectations: ["Biological Evaluation Plan (BEP)"], evidenceExpectations: ["Biological Evaluation Report (BER)"], riskRelevance: ["Cytotoxicity, sensitisation, irritation"] },
      { clauseNo: "Annex A", title: "Endpoints for biological evaluation", summary: "Select toxicological endpoints (e.g. cytotoxicity, sensitisation, irritation, systemic toxicity) by contact category.", keywords: "endpoints, cytotoxicity, sensitisation, genotoxicity, chemical characterisation", documentExpectations: ["Endpoint matrix / justification"], evidenceExpectations: ["Test reports per endpoint (ISO 10993-5/-10/-11)"] },
    ],
  },
  {
    code: "IEC 62366-1", title: "Application of usability engineering to medical devices (summary)", version: "2015+A1:2020",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 5", title: "Usability engineering process", summary: "Specify use, identify hazards related to usability, and establish a user interface specification and evaluation plan.", keywords: "usability, human factors, use error, user interface, use specification", documentExpectations: ["Usability Engineering File", "Use specification"], evidenceExpectations: ["Formative & summative evaluation reports"], riskRelevance: ["Use error leading to harm"] },
      { clauseNo: "Clause 5.7-5.9", title: "Summative evaluation of safety-related use", summary: "Demonstrate that safety-related use scenarios can be performed without unacceptable use errors.", keywords: "summative evaluation, validation, critical task", documentExpectations: ["Summative usability test protocol"], evidenceExpectations: ["Summative usability test report"] },
    ],
  },
  {
    code: "IEC 62304", title: "Medical device software — Software life cycle processes (summary)", version: "2006+A1:2015",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 4-5", title: "Software safety classification and development", summary: "Assign software safety class (A/B/C) and follow a planned development process with architecture and detailed design.", keywords: "software, safety class, sdlc, architecture, mdsw", applicability: "Devices containing software", documentExpectations: ["Software development plan", "Software requirements specification"], evidenceExpectations: ["Software verification records"] },
      { clauseNo: "Clause 7", title: "Software risk management", summary: "Identify and control software contributing to hazardous situations; integrate with ISO 14971.", keywords: "software risk, hazard, mitigation", documentExpectations: ["Software risk analysis"], evidenceExpectations: ["Risk control verification"] },
      { clauseNo: "Clause 8-9", title: "Configuration management and problem resolution (SOUP)", summary: "Control versions/changes and manage problems; identify and evaluate SOUP/OTS components.", keywords: "configuration management, soup, problem resolution, change", documentExpectations: ["SOUP list", "Problem reports"], evidenceExpectations: ["Change records, anomaly list"] },
    ],
  },
  {
    code: "ISO 11135", title: "Sterilization — Ethylene oxide (summary)", version: "2014",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 8-9", title: "Process definition and validation (IQ/OQ/PQ)", summary: "Define the EO process and validate via installation, operational and performance qualification with routine control.", keywords: "ethylene oxide, eo, validation, iq oq pq, sal", applicability: "EO-sterilized devices", documentExpectations: ["EO sterilization validation plan"], evidenceExpectations: ["IQ/OQ/PQ reports", "EO/ECH residual testing (ISO 10993-7)"], riskRelevance: ["Loss of sterility; residual toxicity"] },
    ],
  },
  {
    code: "ISO 11137", title: "Sterilization — Radiation (summary)", version: "2006+A2:2018",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Part 2", title: "Establishing the sterilization dose", summary: "Establish and substantiate the radiation sterilization dose (e.g. VDmax) and perform dose audits.", keywords: "gamma, e-beam, radiation, dose setting, vdmax, sal", applicability: "Radiation-sterilized devices", documentExpectations: ["Dose-setting protocol"], evidenceExpectations: ["Dose establishment & dose audit reports"], riskRelevance: ["Loss of sterility; material degradation"] },
    ],
  },
  {
    code: "ISO 11607", title: "Packaging for terminally sterilized medical devices (summary)", version: "2019",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Part 1", title: "Materials and sterile barrier systems", summary: "Requirements for materials, sterile barrier systems and packaging systems, including stability/ageing.", keywords: "packaging, sterile barrier, sbs, pouch, ageing, shelf life", applicability: "Sterile devices", documentExpectations: ["Packaging specification"], evidenceExpectations: ["Seal strength, integrity and ageing data"] },
      { clauseNo: "Part 2", title: "Validation of forming, sealing and assembly", summary: "Validate forming, sealing and assembly processes (IQ/OQ/PQ) for the sterile barrier system.", keywords: "sealing validation, process validation, integrity", documentExpectations: ["Packaging process validation plan"], evidenceExpectations: ["Sealing IQ/OQ/PQ reports"] },
    ],
  },
  {
    code: "ISO 15223-1", title: "Symbols to be used with information supplied by the manufacturer (summary)", version: "2021",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 5", title: "Symbols for labels and IFU", summary: "Harmonised symbols (manufacturer, use-by, LOT, sterile, single use, MD, UDI, caution) for labelling.", keywords: "symbols, label, ifu, single use, sterile, udi", documentExpectations: ["Label artwork with symbol legend"], evidenceExpectations: ["Label/IFU symbol justification"] },
    ],
  },
  {
    code: "ISO 20417", title: "Information supplied by the manufacturer (summary)", version: "2021",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 6-7", title: "Information requirements for label and IFU", summary: "Specifies the information to be supplied on the label and in the instructions for use of medical devices.", keywords: "label, ifu, information supplied, manufacturer, accompanying documents", documentExpectations: ["Label content checklist", "IFU"], evidenceExpectations: ["IFU/label aligned with Annex I 23"] },
    ],
  },
  {
    code: "IEC 60601-1", title: "Medical electrical equipment — Basic safety and essential performance (summary)", version: "2005+A1:2012+A2:2020",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "Clause 8", title: "Protection against electrical hazards", summary: "Requirements for protection against electric shock, leakage currents and dielectric strength.", keywords: "electrical safety, leakage current, dielectric, means of protection", applicability: "Active / electrical devices", documentExpectations: ["Electrical safety test plan"], evidenceExpectations: ["IEC 60601-1 test report"], riskRelevance: ["Electric shock, energy hazards"] },
      { clauseNo: "Collateral 60601-1-2", title: "Electromagnetic compatibility (EMC)", summary: "EMC requirements and tests (emissions and immunity) for medical electrical equipment.", keywords: "emc, electromagnetic compatibility, emissions, immunity", applicability: "Active / electrical devices", documentExpectations: ["EMC test plan"], evidenceExpectations: ["IEC 60601-1-2 EMC report"] },
    ],
  },
  {
    code: "ISO 14155", title: "Clinical investigation of medical devices for human subjects — GCP (summary)", version: "2020",
    sourceType: "TEMPLATE_SUMMARY", jurisdiction: "International",
    clauses: [
      { clauseNo: "GCP", title: "Good clinical practice for device investigations", summary: "Design, conduct, recording and reporting of clinical investigations to protect subjects and ensure data integrity.", keywords: "clinical investigation, gcp, cip, ethics, informed consent", applicability: "Devices requiring clinical investigation", documentExpectations: ["Clinical Investigation Plan (CIP)"], evidenceExpectations: ["Clinical investigation report"] },
    ],
  },
  {
    code: "MDCG Guidance", title: "Medical Device Coordination Group guidance documents (public)", version: "various",
    sourceType: "PUBLIC_REGULATION", jurisdiction: "European Union",
    clauses: [
      { clauseNo: "MDCG 2021-24", title: "Classification of medical devices", summary: "Guidance on applying the MDR Annex VIII classification rules to determine device class.", keywords: "classification, annex viii, rules, class i iia iib iii", documentExpectations: ["Classification rationale"], evidenceExpectations: ["Documented classification per Annex VIII"] },
      { clauseNo: "MDCG 2019-11", title: "Qualification and classification of software (MDSW)", summary: "Determines when software is a medical device and how to classify it (Rule 11).", keywords: "software, mdsw, qualification, classification, rule 11", applicability: "Software devices", documentExpectations: ["MDSW qualification/classification rationale"] },
      { clauseNo: "MDCG 2018-1", title: "UDI assignment and Basic UDI-DI", summary: "Guidance on assigning UDI-DI / Basic UDI-DI and the UDI system structure.", keywords: "udi, basic udi-di, udi-di, eudamed, identification", documentExpectations: ["UDI assignment record"], evidenceExpectations: ["Basic UDI-DI / UDI-DI registered"] },
      { clauseNo: "MDCG 2020-3", title: "Significant changes under the transitional provisions", summary: "Criteria for what constitutes a 'significant change' in design or intended purpose (Art. 120).", keywords: "significant change, article 120, transitional, change", documentExpectations: ["Change significance assessment"] },
      { clauseNo: "MDCG 2022-21", title: "Periodic Safety Update Report (PSUR)", summary: "Guidance on content and format of the PSUR proportionate to device class.", keywords: "psur, periodic safety update, post-market, trend", documentExpectations: ["PSUR"], evidenceExpectations: ["PSUR with PMS data and conclusions"] },
      { clauseNo: "MDCG 2020-7", title: "PMCF Plan template", summary: "Template and guidance for the Post-Market Clinical Follow-up plan.", keywords: "pmcf, plan, post-market clinical follow-up, annex xiv b", documentExpectations: ["PMCF Plan"] },
      { clauseNo: "MDCG 2020-8", title: "PMCF Evaluation Report template", summary: "Template and guidance for the PMCF Evaluation Report.", keywords: "pmcf, evaluation report, post-market clinical follow-up", documentExpectations: ["PMCF Evaluation Report"] },
      { clauseNo: "MDCG 2019-9", title: "Summary of Safety and Clinical Performance (SSCP)", summary: "Guidance on drafting the SSCP for implantable and Class III devices (Art. 32).", keywords: "sscp, safety, clinical performance, class iii, implantable", applicability: "Class III / implantable devices", documentExpectations: ["SSCP"] },
      { clauseNo: "MDCG 2020-5", title: "Clinical evaluation — equivalence", summary: "Guidance on demonstrating equivalence for clinical evaluation (technical, biological, clinical).", keywords: "clinical evaluation, equivalence, cer, annex xiv", documentExpectations: ["Equivalence demonstration"] },
      { clauseNo: "MDCG 2019-16", title: "Cybersecurity for medical devices", summary: "Guidance on cybersecurity requirements under the MDR (secure design, IT security).", keywords: "cybersecurity, it security, software, annex i 17.4", applicability: "Connected / software devices", documentExpectations: ["Cybersecurity risk assessment"] },
      { clauseNo: "MDCG 2020-6", title: "Sufficient clinical evidence for legacy devices", summary: "Guidance on demonstrating sufficient clinical evidence under the MDR transitional provisions and clinical evaluation.", keywords: "clinical evidence, legacy, transitional, cer, annex xiv", documentExpectations: ["Clinical evaluation report with evidence rationale"] },
      { clauseNo: "MDCG 2020-1", title: "Clinical evaluation — CEP template", summary: "Template for the Clinical Evaluation Plan under MDR Annex XIV.", keywords: "cep, clinical evaluation plan, annex xiv", documentExpectations: ["Clinical Evaluation Plan (CEP)"] },
      { clauseNo: "MDCG 2020-13", title: "Clinical evaluation assessment report template", summary: "Template for documenting the clinical evaluation assessment.", keywords: "clinical evaluation, assessment, cer", documentExpectations: ["Clinical evaluation assessment report"] },
      { clauseNo: "MDCG 2019-8", title: "Implant card guidance", summary: "Guidance on the implant card and information supplied to the patient (MDR Art. 18).", keywords: "implant card, patient information, art 18", applicability: "Implantable devices", documentExpectations: ["Implant card content"] },
      { clauseNo: "MDCG 2022-5", title: "Classification of devices incorporating nanomaterials", summary: "Guidance on borderline and classification aspects for devices with nanomaterials.", keywords: "nanomaterial, classification, borderline", applicability: "Devices with nanomaterials", documentExpectations: ["Nanomaterial risk assessment"] },
    ],
  },
];
