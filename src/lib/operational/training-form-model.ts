import { buildFormHr01 } from "@/lib/qms/form-templates";
import {
  checkboxChecked,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";

export interface TrainingParticipant {
  no: string;
  name: string;
  department: string;
  attended: boolean;
  assessmentResult: string;
  signature: string;
}

export interface TrainingFormData {
  recordNo: string;
  trainingDate: string;
  topic: string;
  duration: string;
  location: string;
  trainer: string;
  methodFaceToFace: boolean;
  methodOnline: boolean;
  methodOjt: boolean;
  methodOther: boolean;
  methodOtherNote: string;
  relatedDocuments: string;
  participants: TrainingParticipant[];
  evalQuiz: boolean;
  evalObservation: boolean;
  evalOral: boolean;
  evalPractical: boolean;
  evalOther: boolean;
  evalOtherNote: string;
  evaluationSummary: string;
  trainingEffective: boolean | null;
  effectivenessNote: string;
  approvedBy: string;
  approvalDate: string;
}

function emptyParticipant(no: number): TrainingParticipant {
  return {
    no: String(no),
    name: "",
    department: "",
    attended: false,
    assessmentResult: "",
    signature: "",
  };
}

export function defaultTrainingParticipants(count = 4): TrainingParticipant[] {
  return Array.from({ length: count }, (_, i) => emptyParticipant(i + 1));
}

export function emptyTrainingFormData(): TrainingFormData {
  return {
    recordNo: "",
    trainingDate: "",
    topic: "",
    duration: "",
    location: "",
    trainer: "",
    methodFaceToFace: false,
    methodOnline: false,
    methodOjt: false,
    methodOther: false,
    methodOtherNote: "",
    relatedDocuments: "",
    participants: defaultTrainingParticipants(),
    evalQuiz: false,
    evalObservation: false,
    evalOral: false,
    evalPractical: false,
    evalOther: false,
    evalOtherNote: "",
    evaluationSummary: "",
    trainingEffective: null,
    effectivenessNote: "",
    approvedBy: "",
    approvalDate: "",
  };
}

function fmtCell(value: string): string {
  const v = value.trim();
  return v || "__________";
}

function chk(label: string, checked: boolean): string {
  return `${checked ? "☑" : "☐"} ${label}`;
}

function parseYesNoRow(line: string): boolean | null {
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  if (/☑|✓|✔|\[x\]/i.test(parts[1] ?? "")) return true;
  if (/☑|✓|✔|\[x\]/i.test(parts[2] ?? "")) return false;
  return null;
}

function parseApproval(content: string, locale: "tr" | "en"): { by: string; date: string } {
  const pattern =
    locale === "tr"
      ? /\*\*Onaylayan:\*\*\s*(.*?)\s*\*\*Tarih:\*\*\s*(.*?)$/m
      : /\*\*Approved by:\*\*\s*(.*?)\s*\*\*Date:\*\*\s*(.*?)$/m;
  const m = content.match(pattern);
  if (!m) return { by: "", date: "" };
  return {
    by: m[1].replace(/_+/g, "").trim(),
    date: m[2].replace(/_+/g, "").trim(),
  };
}

function parseParticipantsTable(content: string, locale: "tr" | "en"): TrainingParticipant[] {
  const sectionRe =
    locale === "tr" ? /^##\s+Katılımcılar/m : /^##\s+Participants/m;
  const match = content.match(sectionRe);
  if (!match || match.index == null) return defaultTrainingParticipants();

  const rest = content.slice(match.index);
  const nextSection = rest.search(/^##\s+(?!Katılımcılar|Participants)/m);
  const section = nextSection > 0 ? rest.slice(0, nextSection) : rest;

  const participants: TrainingParticipant[] = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes("---")) continue;
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 4) continue;
    const header = cells.join(" ").toLowerCase();
    if (header.includes("ad soyad") || header.includes("name")) continue;

    participants.push({
      no: cells[0] ?? "",
      name: cells[1] ?? "",
      department: cells[2] ?? "",
      attended: /☑|✓|✔|\[x\]/i.test(cells[3] ?? ""),
      assessmentResult: cells[4] ?? "",
      signature: cells[5] ?? "",
    });
  }

  return participants.length > 0 ? participants : defaultTrainingParticipants();
}

export function parseTrainingFormMarkdown(content: string, locale: "tr" | "en"): TrainingFormData {
  if (!content.trim()) {
    return parseTrainingFormMarkdown(buildFormHr01(locale), locale);
  }

  const data = emptyTrainingFormData();
  const infoSectionRe =
    locale === "tr" ? /^##\s+Eğitim bilgileri/m : /^##\s+Training information/m;
  const infoMatch = content.match(infoSectionRe);
  const infoBlock = infoMatch && infoMatch.index != null ? content.slice(infoMatch.index) : content;
  const infoFields = parseMarkdownFormFields(infoBlock.split(/^##\s+/m)[0] ?? infoBlock);

  data.recordNo =
    pickField(infoFields, "kayıt no", "record no", "eğitim no", "training no") ?? "";
  data.trainingDate = pickField(infoFields, "eğitim tarihi", "training date", "tarih", "date") ?? "";
  data.topic = pickField(infoFields, "eğitim konusu", "training topic", "konu", "topic") ?? "";
  data.duration = pickField(infoFields, "süre", "duration") ?? "";
  data.location = pickField(infoFields, "yer", "location") ?? "";
  data.trainer = pickField(infoFields, "eğitmen", "trainer") ?? "";

  const methodRow = pickField(infoFields, "eğitim yöntemi", "training method") ?? "";
  if (locale === "tr") {
    data.methodFaceToFace = checkboxChecked(methodRow, "yüz yüze");
    data.methodOnline = checkboxChecked(methodRow, "online");
    data.methodOjt = checkboxChecked(methodRow, "iş başında") || checkboxChecked(methodRow, "ojt");
    data.methodOther = checkboxChecked(methodRow, "diğer");
  } else {
    data.methodFaceToFace = checkboxChecked(methodRow, "face-to-face");
    data.methodOnline = checkboxChecked(methodRow, "online");
    data.methodOjt = checkboxChecked(methodRow, "on-the-job") || checkboxChecked(methodRow, "ojt");
    data.methodOther = checkboxChecked(methodRow, "other");
  }
  data.methodOtherNote = pickField(infoFields, "yöntem (diğer)", "method (other)") ?? "";
  data.relatedDocuments =
    pickField(infoFields, "ilgili prosedür / doküman", "related procedure / document") ?? "";

  data.participants = parseParticipantsTable(content, locale);

  const evalSectionRe =
    locale === "tr" ? /^##\s+Eğitim değerlendirmesi/m : /^##\s+Training evaluation/m;
  const evalMatch = content.match(evalSectionRe);
  const evalBlock = evalMatch && evalMatch.index != null ? content.slice(evalMatch.index) : "";
  const evalFields = parseMarkdownFormFields(evalBlock);

  const evalMethodRow =
    pickField(evalFields, "değerlendirme yöntemi", "evaluation method") ?? "";
  if (locale === "tr") {
    data.evalQuiz = checkboxChecked(evalMethodRow, "quiz");
    data.evalObservation = checkboxChecked(evalMethodRow, "gözlem");
    data.evalOral = checkboxChecked(evalMethodRow, "sözlü");
    data.evalPractical = checkboxChecked(evalMethodRow, "pratik");
    data.evalOther = checkboxChecked(evalMethodRow, "diğer");
  } else {
    data.evalQuiz = checkboxChecked(evalMethodRow, "quiz");
    data.evalObservation = checkboxChecked(evalMethodRow, "observation");
    data.evalOral = checkboxChecked(evalMethodRow, "oral");
    data.evalPractical = checkboxChecked(evalMethodRow, "practical");
    data.evalOther = checkboxChecked(evalMethodRow, "other");
  }
  data.evalOtherNote =
    pickField(evalFields, "değerlendirme yöntemi (diğer)", "evaluation method (other)") ?? "";
  data.evaluationSummary =
    pickField(evalFields, "değerlendirme özeti", "evaluation summary") ?? "";
  data.effectivenessNote =
    pickField(evalFields, "etkinlik notu", "effectiveness note") ?? "";

  for (const line of evalBlock.split("\n")) {
    const lower = line.toLowerCase();
    if (
      (locale === "tr" && lower.includes("eğitim etkin")) ||
      (locale === "en" && lower.includes("training effective"))
    ) {
      data.trainingEffective = parseYesNoRow(line);
    }
  }

  const approval = parseApproval(content, locale);
  data.approvedBy = approval.by;
  data.approvalDate = approval.date;

  return data;
}

export function serializeTrainingFormMarkdown(data: TrainingFormData, locale: "tr" | "en"): string {
  const template = buildFormHr01(locale);
  const approvalIdx = template.search(/^##\s+(Onay|Approval)/m);
  const approval = approvalIdx > 0 ? template.slice(approvalIdx).trim() : "";

  const methodTr = [
    chk("Yüz yüze", data.methodFaceToFace),
    chk("Online", data.methodOnline),
    chk("İş başında (OJT)", data.methodOjt),
    chk("Diğer", data.methodOther),
  ].join(" ");

  const methodEn = [
    chk("Face-to-face", data.methodFaceToFace),
    chk("Online", data.methodOnline),
    chk("On-the-job (OJT)", data.methodOjt),
    chk("Other", data.methodOther),
  ].join(" ");

  const evalTr = [
    chk("Quiz", data.evalQuiz),
    chk("Gözlem", data.evalObservation),
    chk("Sözlü", data.evalOral),
    chk("Pratik uygulama", data.evalPractical),
    chk("Diğer", data.evalOther),
  ].join(" ");

  const evalEn = [
    chk("Quiz", data.evalQuiz),
    chk("Observation", data.evalObservation),
    chk("Oral", data.evalOral),
    chk("Practical", data.evalPractical),
    chk("Other", data.evalOther),
  ].join(" ");

  const yesMark = data.trainingEffective === true ? "☑" : "☐";
  const noMark = data.trainingEffective === false ? "☑" : "☐";

  const participantRows = data.participants.map((p, i) => {
    const no = p.no.trim() || String(i + 1);
    const attendedMark = p.attended ? "☑" : "☐";
    return locale === "tr"
      ? `| ${no} | ${fmtCell(p.name)} | ${fmtCell(p.department)} | ${attendedMark} | ${fmtCell(p.assessmentResult)} | ${fmtCell(p.signature)} |`
      : `| ${no} | ${fmtCell(p.name)} | ${fmtCell(p.department)} | ${attendedMark} | ${fmtCell(p.assessmentResult)} | ${fmtCell(p.signature)} |`;
  });

  const body =
    locale === "tr"
      ? [
          "## Eğitim bilgileri",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Kayıt no | ${fmtCell(data.recordNo)} |`,
          `| Eğitim tarihi | ${fmtCell(data.trainingDate)} |`,
          `| Eğitim konusu | ${fmtCell(data.topic)} |`,
          `| Süre | ${fmtCell(data.duration)} |`,
          `| Yer | ${fmtCell(data.location)} |`,
          `| Eğitmen | ${fmtCell(data.trainer)} |`,
          `| Eğitim yöntemi | ${methodTr} |`,
          `| Yöntem (diğer) | ${fmtCell(data.methodOtherNote)} |`,
          `| İlgili prosedür / doküman | ${fmtCell(data.relatedDocuments)} |`,
          "",
          "## Katılımcılar",
          "",
          "| No | Ad soyad | Departman | Katıldı | Değerlendirme sonucu | İmza |",
          "|----|----------|-----------|---------|---------------------|------|",
          ...participantRows,
          "",
          "## Eğitim değerlendirmesi",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Değerlendirme yöntemi | ${evalTr} |`,
          `| Değerlendirme yöntemi (diğer) | ${fmtCell(data.evalOtherNote)} |`,
          `| Değerlendirme özeti | ${fmtCell(data.evaluationSummary)} |`,
          `| Eğitim etkin mi? | ${yesMark} Evet | ${noMark} Hayır |`,
          `| Etkinlik notu | ${fmtCell(data.effectivenessNote)} |`,
          "",
          `**Onaylayan:** ${fmtCell(data.approvedBy)}  **Tarih:** ${fmtCell(data.approvalDate)}`,
        ].join("\n")
      : [
          "## Training information",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Record no | ${fmtCell(data.recordNo)} |`,
          `| Training date | ${fmtCell(data.trainingDate)} |`,
          `| Training topic | ${fmtCell(data.topic)} |`,
          `| Duration | ${fmtCell(data.duration)} |`,
          `| Location | ${fmtCell(data.location)} |`,
          `| Trainer | ${fmtCell(data.trainer)} |`,
          `| Training method | ${methodEn} |`,
          `| Method (other) | ${fmtCell(data.methodOtherNote)} |`,
          `| Related procedure / document | ${fmtCell(data.relatedDocuments)} |`,
          "",
          "## Participants",
          "",
          "| No | Name | Department | Attended | Assessment result | Signature |",
          "|----|------|------------|----------|-------------------|-----------|",
          ...participantRows,
          "",
          "## Training evaluation",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Evaluation method | ${evalEn} |`,
          `| Evaluation method (other) | ${fmtCell(data.evalOtherNote)} |`,
          `| Evaluation summary | ${fmtCell(data.evaluationSummary)} |`,
          `| Training effective? | ${yesMark} Yes | ${noMark} No |`,
          `| Effectiveness note | ${fmtCell(data.effectivenessNote)} |`,
          "",
          `**Approved by:** ${fmtCell(data.approvedBy)}  **Date:** ${fmtCell(data.approvalDate)}`,
        ].join("\n");

  const headerEnd = template.search(/^##\s+(Eğitim bilgileri|Training information)/m);
  const header = headerEnd > 0 ? template.slice(0, headerEnd).trim() : "";

  return [header, body, approval].filter(Boolean).join("\n\n");
}
