import {
  inferCapaRequired,
  inferCapaStatus,
  inferComplaintStatus,
  parseFormDate,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";

export function capaFieldsFromFormContent(content: string, fallbackTitle?: string) {
  const fields = parseMarkdownFormFields(content);
  const referenceNo = pickField(fields, "capa no", "capa no.");
  const description = pickField(fields, "açıklama", "description");
  const rootCause = pickField(fields, "kök neden analizi", "root cause analysis", "kök neden özeti", "root cause summary");
  const correction = pickField(fields, "düzeltme", "correction");
  const correctiveAction = pickField(
    fields,
    "düzeltici faaliyet",
    "corrective action",
    "düzeltici / önleyici aksiyon özeti",
    "corrective / preventive action summary",
  );
  const ownerName = pickField(fields, "sorumlu", "owner", "capa sorumlusu", "capa owner");
  const dueDate = parseFormDate(pickField(fields, "hedef tarih", "target date", "capa hedef tarih", "capa target date"));
  const source = pickField(fields, "kaynak", "source");

  const title =
    description?.slice(0, 500) ||
    fallbackTitle?.slice(0, 500) ||
    (source ? `${source}${referenceNo ? ` (${referenceNo})` : ""}` : undefined) ||
    referenceNo ||
    undefined;

  return {
    referenceNo: referenceNo ?? null,
    title,
    rootCause: rootCause ?? null,
    correction: correction ?? null,
    correctiveAction: correctiveAction ?? null,
    ownerName: ownerName ?? null,
    dueDate,
    status: inferCapaStatus(fields, dueDate),
  };
}

export function complaintFieldsFromFormContent(content: string, fallbackTitle?: string) {
  const fields = parseMarkdownFormFields(content);
  const complaintNo = pickField(fields, "şikâyet no", "complaint no", "şikâyet no form-ch-01", "complaint no form-ch-01");
  const description = pickField(fields, "şikâyet açıklaması", "description");
  const lotNumber = pickField(fields, "lot / seri no", "lot / serial no", "ürün / lot", "product / lot");
  const source = pickField(fields, "kaynak", "source");
  const ownerName = pickField(fields, "değerlendiren", "assessed by", "capa sorumlusu", "capa owner");
  const receivedAt = parseFormDate(pickField(fields, "alım tarihi", "received date", "şikâyet değerlendirme tarihi", "complaint assessment date"));
  const capaRef = pickField(fields, "capa no", "capa no.");
  const capaRequired = inferCapaRequired(fields) || Boolean(capaRef);

  const title =
    description?.slice(0, 500) ||
    fallbackTitle?.slice(0, 500) ||
    complaintNo ||
    undefined;

  return {
    complaintNo: complaintNo ?? null,
    title,
    description: description ?? null,
    lotNumber: lotNumber ?? null,
    source: source ?? null,
    ownerName: ownerName ?? null,
    capaRequired,
    capaRef: capaRef ?? null,
    receivedAt,
    status: inferComplaintStatus(fields),
  };
}
