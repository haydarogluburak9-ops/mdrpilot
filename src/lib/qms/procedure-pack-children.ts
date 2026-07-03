import type { KysStructureTemplate } from "./kys-structure";

/**
 * Child document templates for ISO 13485 procedures not covered by base KYS scaffold.
 * Merged into KYS_STRUCTURE_TEMPLATES in kys-structure.ts.
 */
export const EXTENDED_PROCEDURE_CHILDREN: KysStructureTemplate[] = [
  // SOP-MDF — Medical device file
  { code: "LIST-MDF-01", title: "Master Device File Index", layer: "LIST", clauseRefs: "4.2.3", parentProcedureCode: "SOP-MDF" },
  { code: "FORM-MDF-01", title: "Medical Device File Checklist", layer: "FORM", clauseRefs: "4.2.3", parentProcedureCode: "SOP-MDF" },
  { code: "REC-MDF-01", title: "Sample Device File Index Record", layer: "RECORD", clauseRefs: "4.2.3", parentProcedureCode: "SOP-MDF" },

  // SOP-HR — Training & competence
  { code: "FORM-HR-01", title: "Training Record Form", layer: "FORM", clauseRefs: "6.2", parentProcedureCode: "SOP-HR" },
  { code: "LIST-HR-01", title: "Training and Competence Matrix", layer: "LIST", clauseRefs: "6.2", parentProcedureCode: "SOP-HR" },
  { code: "PLAN-HR-01", title: "Annual Training Plan", layer: "PLAN", clauseRefs: "6.2", parentProcedureCode: "SOP-HR" },
  { code: "REC-HR-01", title: "Sample Training Record", layer: "RECORD", clauseRefs: "6.2", parentProcedureCode: "SOP-HR" },

  // SOP-INF — Infrastructure
  { code: "LIST-INF-01", title: "Infrastructure and Maintenance Register", layer: "LIST", clauseRefs: "6.3", parentProcedureCode: "SOP-INF" },
  { code: "FORM-INF-01", title: "Maintenance Request and Log Form", layer: "FORM", clauseRefs: "6.3", parentProcedureCode: "SOP-INF" },
  { code: "WI-INF-01", title: "Equipment Maintenance Work Instruction Template", layer: "INSTRUCTION", clauseRefs: "6.3", parentProcedureCode: "SOP-INF" },

  // SOP-ENV — Work environment
  { code: "FORM-ENV-01", title: "Environmental Monitoring Record", layer: "FORM", clauseRefs: "6.4", parentProcedureCode: "SOP-ENV" },
  { code: "LIST-ENV-01", title: "Environmental Monitoring Points List", layer: "LIST", clauseRefs: "6.4", parentProcedureCode: "SOP-ENV" },
  { code: "WI-ENV-01", title: "Clean Area Entry Work Instruction", layer: "INSTRUCTION", clauseRefs: "6.4", parentProcedureCode: "SOP-ENV" },

  // SOP-RM — Risk management
  { code: "DIA-RM-01", title: "Risk Management Process Flow (ISO 14971)", layer: "DIAGRAM", clauseRefs: "7.1 / ISO 14971", parentProcedureCode: "SOP-RM" },
  { code: "FORM-RM-01", title: "Risk Assessment Form", layer: "FORM", clauseRefs: "7.1 / ISO 14971", parentProcedureCode: "SOP-RM" },
  { code: "LIST-RM-01", title: "Risk Register / Hazard Log", layer: "LIST", clauseRefs: "7.1 / ISO 14971", parentProcedureCode: "SOP-RM" },

  // SOP-CRP — Customer requirements
  { code: "FORM-CRP-01", title: "Customer Requirements Review Form", layer: "FORM", clauseRefs: "7.2", parentProcedureCode: "SOP-CRP" },
  { code: "LIST-CRP-01", title: "Customer Order and Requirements Log", layer: "LIST", clauseRefs: "7.2", parentProcedureCode: "SOP-CRP" },

  // SOP-PU — Purchasing
  { code: "FORM-PU-01", title: "Purchase Requisition Form", layer: "FORM", clauseRefs: "7.4", parentProcedureCode: "SOP-PU" },
  { code: "LIST-PU-01", title: "Purchase Order Register", layer: "LIST", clauseRefs: "7.4", parentProcedureCode: "SOP-PU" },

  // SOP-SE — Supplier evaluation
  { code: "FORM-SE-01", title: "Supplier Evaluation Form", layer: "FORM", clauseRefs: "7.4.1", parentProcedureCode: "SOP-SE" },
  { code: "LIST-SE-01", title: "Approved Supplier List", layer: "LIST", clauseRefs: "7.4.1", parentProcedureCode: "SOP-SE" },
  { code: "REC-SE-01", title: "Sample Supplier Evaluation Record", layer: "RECORD", clauseRefs: "7.4.1", parentProcedureCode: "SOP-SE" },

  // SOP-CLN — Product cleanliness
  { code: "FORM-CLN-01", title: "Cleanliness Inspection Record", layer: "FORM", clauseRefs: "7.5.2", parentProcedureCode: "SOP-CLN" },
  { code: "WI-CLN-01", title: "Product Cleaning Work Instruction Template", layer: "INSTRUCTION", clauseRefs: "7.5.2", parentProcedureCode: "SOP-CLN" },

  // SOP-INST — Installation
  { code: "FORM-INST-01", title: "Installation Checklist", layer: "FORM", clauseRefs: "7.5.3", parentProcedureCode: "SOP-INST" },
  { code: "WI-INST-01", title: "Installation Work Instruction Template", layer: "INSTRUCTION", clauseRefs: "7.5.3", parentProcedureCode: "SOP-INST" },
  { code: "REC-INST-01", title: "Sample Installation Record", layer: "RECORD", clauseRefs: "7.5.3", parentProcedureCode: "SOP-INST" },

  // SOP-SRV — Servicing
  { code: "FORM-SRV-01", title: "Service Report Form", layer: "FORM", clauseRefs: "7.5.4", parentProcedureCode: "SOP-SRV" },
  { code: "WI-SRV-01", title: "Service Work Instruction Template", layer: "INSTRUCTION", clauseRefs: "7.5.4", parentProcedureCode: "SOP-SRV" },

  // SOP-PV — Process validation
  { code: "FORM-PV-01", title: "Process Validation Protocol / Report Form", layer: "FORM", clauseRefs: "7.5.6", parentProcedureCode: "SOP-PV" },
  { code: "LIST-PV-01", title: "Validated Processes List", layer: "LIST", clauseRefs: "7.5.6", parentProcedureCode: "SOP-PV" },

  // SOP-ST — Sterilization
  { code: "FORM-ST-01", title: "Sterilization Batch Record", layer: "FORM", clauseRefs: "7.5.7", parentProcedureCode: "SOP-ST" },
  { code: "WI-ST-01", title: "Sterilization Process Work Instruction Template", layer: "INSTRUCTION", clauseRefs: "7.5.7", parentProcedureCode: "SOP-ST" },
  { code: "LIST-ST-01", title: "Sterilization Cycle Parameters List", layer: "LIST", clauseRefs: "7.5.7", parentProcedureCode: "SOP-ST" },

  // SOP-ID — Identification
  { code: "WI-ID-01", title: "Product Labeling Work Instruction", layer: "INSTRUCTION", clauseRefs: "7.5.8", parentProcedureCode: "SOP-ID" },
  { code: "LIST-ID-01", title: "Label Artwork and Identification Master List", layer: "LIST", clauseRefs: "7.5.8", parentProcedureCode: "SOP-ID" },

  // SOP-TR — Traceability
  { code: "FORM-TR-01", title: "Traceability / Lot Genealogy Form", layer: "FORM", clauseRefs: "7.5.9", parentProcedureCode: "SOP-TR" },
  { code: "LIST-TR-01", title: "Lot / Batch Register", layer: "LIST", clauseRefs: "7.5.9", parentProcedureCode: "SOP-TR" },

  // SOP-PP — Preservation
  { code: "FORM-PP-01", title: "Storage and Preservation Condition Log", layer: "FORM", clauseRefs: "7.5.11", parentProcedureCode: "SOP-PP" },
  { code: "WI-PP-01", title: "Packaging and Storage Work Instruction", layer: "INSTRUCTION", clauseRefs: "7.5.11", parentProcedureCode: "SOP-PP" },

  // SOP-FB — Feedback / PMS
  { code: "PLAN-FB-01", title: "Post-Market Surveillance Plan Template", layer: "PLAN", clauseRefs: "8.2.1", parentProcedureCode: "SOP-FB" },
  { code: "FORM-FB-01", title: "PMS Data Collection Form", layer: "FORM", clauseRefs: "8.2.1", parentProcedureCode: "SOP-FB" },
  { code: "LIST-FB-01", title: "PMS Data Sources Register", layer: "LIST", clauseRefs: "8.2.1", parentProcedureCode: "SOP-FB" },

  // SOP-VG — Vigilance
  { code: "DIA-VG-01", title: "Vigilance Reporting Timelines Flow", layer: "DIAGRAM", clauseRefs: "8.2.3 / MDR Art. 87-90", parentProcedureCode: "SOP-VG" },
  { code: "FORM-VG-01", title: "Vigilance Initial Report Form", layer: "FORM", clauseRefs: "8.2.3", parentProcedureCode: "SOP-VG" },
  { code: "WI-VG-01", title: "EUDAMED Vigilance Reporting Work Instruction", layer: "INSTRUCTION", clauseRefs: "8.2.3 / MDR Art. 87", parentProcedureCode: "SOP-VG" },

  // SOP-MON — Monitoring
  { code: "FORM-MON-01", title: "Process and Product Monitoring Record", layer: "FORM", clauseRefs: "8.2.5 / 8.2.6", parentProcedureCode: "SOP-MON" },
  { code: "LIST-MON-01", title: "Monitoring KPI and Metrics List", layer: "LIST", clauseRefs: "8.2.5", parentProcedureCode: "SOP-MON" },

  // SOP-DA — Data analysis
  { code: "PLAN-DA-01", title: "Annual Data Analysis Plan", layer: "PLAN", clauseRefs: "8.4", parentProcedureCode: "SOP-DA" },
  { code: "FORM-DA-01", title: "Data Analysis and Trend Report Form", layer: "FORM", clauseRefs: "8.4", parentProcedureCode: "SOP-DA" },

  // Enrich existing thin packs — operational sample records
  { code: "REC-IA-01", title: "Sample Internal Audit Report", layer: "RECORD", clauseRefs: "8.2.4", parentProcedureCode: "SOP-IA" },
  { code: "REC-MR-01", title: "Sample Management Review Minutes", layer: "RECORD", clauseRefs: "5.6", parentProcedureCode: "SOP-MR" },
  { code: "REC-CH-01", title: "Sample Complaint Record", layer: "RECORD", clauseRefs: "8.2.2", parentProcedureCode: "SOP-CH" },
  { code: "REC-CH-02", title: "Sample Complaint–CAPA Linkage Record", layer: "RECORD", clauseRefs: "8.2.2 / 8.5.2", parentProcedureCode: "SOP-CH" },
  { code: "REC-CAPA-01", title: "Sample CAPA Record", layer: "RECORD", clauseRefs: "8.5.2", parentProcedureCode: "SOP-CAPA" },

  // SOP-DC — document control supplement
  { code: "FORM-DC-01", title: "Document Distribution and Obsolete Control Log", layer: "FORM", clauseRefs: "4.2.4", parentProcedureCode: "SOP-DC" },
];
