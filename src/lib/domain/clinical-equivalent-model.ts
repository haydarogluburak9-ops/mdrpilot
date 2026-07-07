export type EquivalencePillarRating = "equivalent" | "similar" | "different" | "unknown";

export interface EquivalentEvidenceScreenshot {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  caption?: string;
}

export interface EquivalentDeviceRecord {
  id: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  regulatoryRef: string;
  deviceClass: string;
  intendedUse: string;
  clinicalPillar: EquivalencePillarRating;
  clinicalNotes: string;
  technicalPillar: EquivalencePillarRating;
  technicalNotes: string;
  biologicalPillar: EquivalencePillarRating;
  biologicalNotes: string;
  dataSource: string;
  evidenceUrl?: string;
  fdaKNumber?: string;
  liveVerified?: boolean;
  liveQueryUrl?: string;
  evidenceScreenshots?: EquivalentEvidenceScreenshot[];
  /** Competitor IFU / datasheet PDF (EK-5). */
  datasheetFile?: {
    storageKey: string;
    fileName: string;
    mimeType: string;
  };
  cerComment?: string;
  notes: string;
  preparedByMedDoc?: boolean;
  /** Karşılaştırma tablosu — eşdeğer cihaz sütunu */
  dimensions?: string;
  rawMaterial?: string;
  biocompatibility?: string;
  sterilizationMethod?: string;
  reusability?: string;
  bodyContactArea?: string;
  patientPopulation?: string;
  shelfLife?: string;
  userProfile?: string;
  contactDuration?: string;
  indications?: string;
}

export interface EquivalentDevicesData {
  searchDate: string;
  searchQuery: string;
  equivalenceClaimed: boolean;
  summary?: string;
  devices: EquivalentDeviceRecord[];
  preparedByMedDoc?: boolean;
  preparedAt?: string;
  notes?: string;
  liveSearchAt?: string;
  liveSearchTotal?: number;
}

export function newEquivalentDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `equiv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyEquivalentDevice(): EquivalentDeviceRecord {
  return {
    id: newEquivalentDeviceId(),
    deviceName: "",
    manufacturer: "",
    model: "",
    regulatoryRef: "",
    deviceClass: "",
    intendedUse: "",
    clinicalPillar: "unknown",
    clinicalNotes: "",
    technicalPillar: "unknown",
    technicalNotes: "",
    biologicalPillar: "unknown",
    biologicalNotes: "",
    dataSource: "",
    notes: "",
  };
}

export function emptyEquivalentDevicesData(productName: string): EquivalentDevicesData {
  return {
    searchDate: new Date().toISOString().slice(0, 10),
    searchQuery: `"${productName}" equivalent OR predicate device`,
    equivalenceClaimed: false,
    devices: [],
    notes: "",
  };
}

function pillarLabel(rating: EquivalencePillarRating, locale: "tr" | "en"): string {
  const tr = locale === "tr";
  switch (rating) {
    case "equivalent":
      return tr ? "Eşdeğer" : "Equivalent";
    case "similar":
      return tr ? "Benzer" : "Similar";
    case "different":
      return tr ? "Farklı" : "Different";
    default:
      return tr ? "Değerlendirilecek" : "To be assessed";
  }
}

function cell(v: string): string {
  return v.replace(/\|/g, "/").replace(/\n/g, " ").trim() || "—";
}

function parseEvidenceScreenshots(raw: unknown): EquivalentEvidenceScreenshot[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: EquivalentEvidenceScreenshot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.storageKey !== "string" || !r.storageKey) continue;
    out.push({
      id: typeof r.id === "string" ? r.id : newEquivalentDeviceId(),
      storageKey: r.storageKey,
      fileName: typeof r.fileName === "string" ? r.fileName : "screenshot.png",
      mimeType: typeof r.mimeType === "string" ? r.mimeType : "image/png",
      uploadedAt: typeof r.uploadedAt === "string" ? r.uploadedAt : new Date().toISOString(),
      caption: typeof r.caption === "string" ? r.caption : undefined,
    });
  }
  return out.length ? out : undefined;
}

export function parseEquivalentDevicesJson(raw: unknown): EquivalentDevicesData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const devices: EquivalentDeviceRecord[] = [];
  if (Array.isArray(r.devices)) {
    for (const row of r.devices) {
      if (!row || typeof row !== "object") continue;
      const d = row as Record<string, unknown>;
      const pillar = (v: unknown): EquivalencePillarRating =>
        v === "equivalent" || v === "similar" || v === "different" ? v : "unknown";
      devices.push({
        id: typeof d.id === "string" && d.id ? d.id : newEquivalentDeviceId(),
        deviceName: typeof d.deviceName === "string" ? d.deviceName : "",
        manufacturer: typeof d.manufacturer === "string" ? d.manufacturer : "",
        model: typeof d.model === "string" ? d.model : "",
        regulatoryRef: typeof d.regulatoryRef === "string" ? d.regulatoryRef : "",
        deviceClass: typeof d.deviceClass === "string" ? d.deviceClass : "",
        intendedUse: typeof d.intendedUse === "string" ? d.intendedUse : "",
        clinicalPillar: pillar(d.clinicalPillar),
        clinicalNotes: typeof d.clinicalNotes === "string" ? d.clinicalNotes : "",
        technicalPillar: pillar(d.technicalPillar),
        technicalNotes: typeof d.technicalNotes === "string" ? d.technicalNotes : "",
        biologicalPillar: pillar(d.biologicalPillar),
        biologicalNotes: typeof d.biologicalNotes === "string" ? d.biologicalNotes : "",
        dataSource: typeof d.dataSource === "string" ? d.dataSource : "",
        evidenceUrl: typeof d.evidenceUrl === "string" ? d.evidenceUrl : undefined,
        fdaKNumber: typeof d.fdaKNumber === "string" ? d.fdaKNumber : undefined,
        liveVerified: d.liveVerified === true,
        liveQueryUrl: typeof d.liveQueryUrl === "string" ? d.liveQueryUrl : undefined,
        evidenceScreenshots: parseEvidenceScreenshots(d.evidenceScreenshots),
        datasheetFile:
          d.datasheetFile &&
          typeof d.datasheetFile === "object" &&
          typeof (d.datasheetFile as { storageKey?: string }).storageKey === "string"
            ? {
                storageKey: (d.datasheetFile as { storageKey: string }).storageKey,
                fileName:
                  typeof (d.datasheetFile as { fileName?: string }).fileName === "string"
                    ? (d.datasheetFile as { fileName: string }).fileName
                    : "datasheet.pdf",
                mimeType:
                  typeof (d.datasheetFile as { mimeType?: string }).mimeType === "string"
                    ? (d.datasheetFile as { mimeType: string }).mimeType
                    : "application/pdf",
              }
            : undefined,
        cerComment: typeof d.cerComment === "string" ? d.cerComment : undefined,
        notes: typeof d.notes === "string" ? d.notes : "",
        preparedByMedDoc: d.preparedByMedDoc === true,
        dimensions: typeof d.dimensions === "string" ? d.dimensions : undefined,
        rawMaterial: typeof d.rawMaterial === "string" ? d.rawMaterial : undefined,
        biocompatibility: typeof d.biocompatibility === "string" ? d.biocompatibility : undefined,
        sterilizationMethod: typeof d.sterilizationMethod === "string" ? d.sterilizationMethod : undefined,
        reusability: typeof d.reusability === "string" ? d.reusability : undefined,
        bodyContactArea: typeof d.bodyContactArea === "string" ? d.bodyContactArea : undefined,
        patientPopulation: typeof d.patientPopulation === "string" ? d.patientPopulation : undefined,
        shelfLife: typeof d.shelfLife === "string" ? d.shelfLife : undefined,
        userProfile: typeof d.userProfile === "string" ? d.userProfile : undefined,
        contactDuration: typeof d.contactDuration === "string" ? d.contactDuration : undefined,
        indications: typeof d.indications === "string" ? d.indications : undefined,
      });
    }
  }
  return {
    searchDate: typeof r.searchDate === "string" ? r.searchDate : "",
    searchQuery: typeof r.searchQuery === "string" ? r.searchQuery : "",
    equivalenceClaimed: r.equivalenceClaimed === true,
    summary: typeof r.summary === "string" ? r.summary : undefined,
    devices,
    preparedByMedDoc: r.preparedByMedDoc === true,
    preparedAt: typeof r.preparedAt === "string" ? r.preparedAt : undefined,
    notes: typeof r.notes === "string" ? r.notes : undefined,
    liveSearchAt: typeof r.liveSearchAt === "string" ? r.liveSearchAt : undefined,
    liveSearchTotal: typeof r.liveSearchTotal === "number" ? r.liveSearchTotal : undefined,
  };
}

export function serializeEquivalentDevicesMarkdown(
  data: EquivalentDevicesData,
  locale: "tr" | "en",
  subjectDeviceName: string,
  tableMarkers?: string[],
): string {
  const tr = locale === "tr";
  const lines = [
    tr ? "## Eşdeğer / benzer cihaz değerlendirmesi" : "## Equivalent / similar device assessment",
    "",
    tr
      ? `**Eşdeğerlik iddiası:** ${data.equivalenceClaimed ? "Evet (üçlü analiz tabloda)" : "Hayır / henüz iddia edilmiyor"}`
      : `**Equivalence claimed:** ${data.equivalenceClaimed ? "Yes (three-pillar tables below)" : "No / not claimed yet"}`,
    "",
    tr ? `- **Tarama tarihi:** ${data.searchDate || "—"}` : `- **Search date:** ${data.searchDate || "—"}`,
    tr
      ? `- **Arama sorgusu:** \`${data.searchQuery.trim() || "—"}\``
      : `- **Search query:** \`${data.searchQuery.trim() || "—"}\``,
    "",
    data.summary?.trim() ||
      (tr
        ? "_MDR Ek XIV ve MEDDEV 2.7/1 Rev. 4 üçlü eşdeğerlik analizi (klinik, teknik, biyolojik) aşağıdaki tablolarda özetlenmiştir._"
        : "_MDR Annex XIV and MEDDEV 2.7/1 Rev. 4 three-pillar equivalence (clinical, technical, biological) summarised below._"),
    "",
  ];

  if (data.devices.length === 0) {
    lines.push(
      tr
        ? "_Henüz eşdeğer cihaz kaydı yok — Eşdeğer ürünler sekmesinden MDRpilot ile arama yapın veya manuel ekleyin._"
        : "_No equivalent device records yet — run MDRpilot search or add manually in the Equivalent products tab._",
    );
    return lines.join("\n");
  }

  const listHeaders = tr
    ? ["#", "Cihaz", "Üretici", "Model", "Reg. referans", "Sınıf", "Veri kaynağı", "Kanıt (URL)"]
    : ["#", "Device", "Manufacturer", "Model", "Reg. reference", "Class", "Data source", "Evidence (URL)"];

  lines.push(
    tr ? "### Eşdeğer / benzer cihaz listesi" : "### Equivalent / similar device list",
    "",
    `| ${listHeaders.join(" | ")} |`,
    `| ${listHeaders.map(() => "---").join(" | ")} |`,
  );

  data.devices.forEach((d, idx) => {
    lines.push(
      `| ${idx + 1} | ${cell(d.deviceName)} | ${cell(d.manufacturer)} | ${cell(d.model)} | ${cell(d.regulatoryRef)} | ${cell(d.deviceClass)} | ${cell(d.dataSource)} | ${cell(d.evidenceUrl ?? "")} |`,
    );
  });

  const pillarHeaders = tr
    ? ["Boyut", "Değerlendirme", "Notlar", "Konu cihaz", "Eşdeğer cihaz"]
    : ["Pillar", "Rating", "Notes", "Subject device", "Equivalent device"];

  data.devices.forEach((d, deviceIdx) => {
    const marker = tableMarkers?.[deviceIdx];
    lines.push(
      "",
      tr
        ? `### ${d.deviceName || "—"} — Eşdeğerlik Tablosu`
        : `### ${d.deviceName || "—"} — Equivalence Table`,
      "",
    );
    if (marker) {
      lines.push(marker, "");
    }
    if (d.liveVerified) {
      lines.push(
        tr
          ? `**Canlı FDA doğrulama:** ${d.fdaKNumber ?? "—"} — [FDA detay](${d.evidenceUrl ?? ""})`
          : `**Live FDA verification:** ${d.fdaKNumber ?? "—"} — [FDA detail](${d.evidenceUrl ?? ""})`,
        d.liveQueryUrl ? (tr ? `- openFDA sorgusu: ${d.liveQueryUrl}` : `- openFDA query: ${d.liveQueryUrl}`) : "",
        "",
      );
    }
    if ((d.evidenceScreenshots?.length ?? 0) > 0) {
      lines.push(
        tr ? `**Kanıt ekran görüntüleri (${d.evidenceScreenshots!.length}):**` : `**Evidence screenshots (${d.evidenceScreenshots!.length}):**`,
        ...(d.evidenceScreenshots!.map(
          (ss, i) => `- ${ss.caption?.trim() || ss.fileName || `Screenshot ${i + 1}`} (${ss.uploadedAt.slice(0, 10)})`,
        )),
        "",
      );
    }
    lines.push(
      tr ? `**Amaçlanan kullanım:** ${cell(d.intendedUse)}` : `**Intended use:** ${cell(d.intendedUse)}`,
      d.cerComment?.trim()
        ? (tr ? `**CER yorumu:** ${cell(d.cerComment)}` : `**CER comment:** ${cell(d.cerComment)}`)
        : "",
      "",
      `| ${pillarHeaders.join(" | ")} |`,
      `| ${pillarHeaders.map(() => "---").join(" | ")} |`,
      `| ${tr ? "**Klinik**" : "**Clinical**"} | ${pillarLabel(d.clinicalPillar, locale)} | ${cell(d.clinicalNotes)} | ${cell(subjectDeviceName)} | ${cell(d.deviceName)} |`,
      `| ${tr ? "**Teknik**" : "**Technical**"} | ${pillarLabel(d.technicalPillar, locale)} | ${cell(d.technicalNotes)} | ${cell(subjectDeviceName)} | ${cell(d.deviceName)} |`,
      `| ${tr ? "**Biyolojik**" : "**Biological**"} | ${pillarLabel(d.biologicalPillar, locale)} | ${cell(d.biologicalNotes)} | ${cell(subjectDeviceName)} | ${cell(d.deviceName)} |`,
    );
    if (d.notes.trim()) {
      lines.push("", tr ? `_${cell(d.notes)}_` : `_${cell(d.notes)}_`);
    }
  });

  lines.push(
    "",
    tr ? "### Sonuç" : "### Conclusion",
    tr
      ? "- Farklılıklar klinik güvenlik veya performansı olumsuz etkilemiyorsa eşdeğerlik verisi kullanılabilir."
      : "- Equivalent-device data may be used if differences do not adversely affect safety or performance.",
    tr
      ? "- Anlamlı farklılıklar için ek klinik veri veya PMCF gerekir."
      : "- Material differences require additional clinical data or PMCF.",
  );

  return lines.filter(Boolean).join("\n");
}
