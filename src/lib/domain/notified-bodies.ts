/**
 * EU notified bodies designated under the Medical Device Regulation (MDR,
 * 2017/745) and/or the In Vitro Diagnostic Regulation (IVDR, 2017/746).
 *
 * Source: European Commission NANDO / Single Market Compliance Space
 * (active designations). The 4-digit `number` is the identification number that
 * appears next to the CE marking (e.g. "CE 0123").
 *
 * This snapshot was taken from the official NANDO database. Designations change
 * frequently (new bodies, scope extensions, suspensions, withdrawals), so always
 * verify the current status directly in EUDAMED / NANDO before relying on it.
 * Manual entry/editing is always allowed in the UI.
 */
export type NbRegulation = "MDR" | "IVDR";

export interface NotifiedBody {
  number: string;
  name: string;
  country: string;
  regulations: NbRegulation[];
}

export const NOTIFIED_BODIES: NotifiedBody[] = [
  { number: "0044", name: "TÜV NORD CERT GmbH", country: "DE", regulations: ["MDR"] },
  { number: "0050", name: "National Standards Authority of Ireland (NSAI)", country: "IE", regulations: ["MDR", "IVDR"] },
  { number: "0051", name: "IMQ Istituto Italiano del Marchio di Qualità S.p.A.", country: "IT", regulations: ["MDR", "IVDR"] },
  { number: "0068", name: "MTIC InterCert S.r.l.", country: "IT", regulations: ["MDR"] },
  { number: "0123", name: "TÜV SÜD Product Service GmbH", country: "DE", regulations: ["MDR", "IVDR"] },
  { number: "0124", name: "DEKRA Certification GmbH", country: "DE", regulations: ["MDR", "IVDR"] },
  { number: "0197", name: "TÜV Rheinland LGA Products GmbH", country: "DE", regulations: ["MDR", "IVDR"] },
  { number: "0297", name: "DQS Medizinprodukte GmbH", country: "DE", regulations: ["MDR"] },
  { number: "0318", name: "Centro Nacional de Certificación de Productos Sanitarios", country: "ES", regulations: ["MDR", "IVDR"] },
  { number: "0333", name: "AFNOR Certification", country: "FR", regulations: ["MDR"] },
  { number: "0344", name: "DEKRA Certification B.V.", country: "NL", regulations: ["MDR", "IVDR"] },
  { number: "0373", name: "Istituto Superiore di Sanità", country: "IT", regulations: ["MDR", "IVDR"] },
  { number: "0425", name: "ICIM S.p.A.", country: "IT", regulations: ["MDR"] },
  { number: "0426", name: "ITALCERT S.r.l.", country: "IT", regulations: ["MDR"] },
  { number: "0459", name: "GMED SAS", country: "FR", regulations: ["MDR", "IVDR"] },
  { number: "0476", name: "Kiwa Cermet Italia S.p.A.", country: "IT", regulations: ["MDR"] },
  { number: "0477", name: "Eurofins Product Testing Italy S.r.l.", country: "IT", regulations: ["MDR"] },
  { number: "0482", name: "DNV MEDCERT GmbH", country: "DE", regulations: ["MDR"] },
  { number: "0483", name: "mdc medical device certification GmbH", country: "DE", regulations: ["MDR", "IVDR"] },
  { number: "0494", name: "SLG Prüf- und Zertifizierungs GmbH", country: "DE", regulations: ["MDR"] },
  { number: "0537", name: "Eurofins Electric & Electronics Finland Oy", country: "FI", regulations: ["MDR", "IVDR"] },
  { number: "0546", name: "Certiquality S.r.l.", country: "IT", regulations: ["MDR"] },
  { number: "0598", name: "SGS Fimko Oy", country: "FI", regulations: ["MDR", "IVDR"] },
  { number: "0633", name: "Berlin Cert GmbH", country: "DE", regulations: ["MDR"] },
  { number: "1011", name: "NEOEMKI LLC", country: "HU", regulations: ["MDR"] },
  { number: "1023", name: "Institut pro testování a certifikaci, a.s. (ITC)", country: "CZ", regulations: ["MDR"] },
  { number: "1282", name: "Ente Certificazione Macchine S.r.l.", country: "IT", regulations: ["MDR"] },
  { number: "1304", name: "Slovenian Institute of Quality and Metrology (SIQ)", country: "SI", regulations: ["MDR"] },
  { number: "1370", name: "Bureau Veritas Italia S.p.A.", country: "IT", regulations: ["MDR"] },
  { number: "1383", name: "Český metrologický institut (CMI)", country: "CZ", regulations: ["MDR"] },
  { number: "1434", name: "Polskie Centrum Badań i Certyfikacji S.A. (PCBC)", country: "PL", regulations: ["MDR", "IVDR"] },
  { number: "1639", name: "SGS Belgium NV", country: "BE", regulations: ["MDR", "IVDR"] },
  { number: "1912", name: "Kiwa Assurance B.V.", country: "NL", regulations: ["MDR"] },
  { number: "1936", name: "TÜV Rheinland Italia S.r.l.", country: "IT", regulations: ["MDR"] },
  { number: "1984", name: "Kiwa Belgelendirme Hizmetleri A.Ş.", country: "TR", regulations: ["MDR"] },
  { number: "2265", name: "3EC International a.s.", country: "SK", regulations: ["MDR", "IVDR"] },
  { number: "2274", name: "TÜV NORD Polska Sp. z o.o.", country: "PL", regulations: ["MDR"] },
  { number: "2292", name: "UDEM Uluslararası Belgelendirme Denetim Eğitim Merkezi San. ve Tic. A.Ş.", country: "TR", regulations: ["MDR"] },
  { number: "2409", name: "CE Certiso Orvos- és Kórháztechnikai Kft.", country: "HU", regulations: ["MDR"] },
  { number: "2443", name: "TÜV SÜD Danmark", country: "DK", regulations: ["MDR"] },
  { number: "2460", name: "DNV Product Assurance AS", country: "NO", regulations: ["MDR", "IVDR"] },
  { number: "2696", name: "UDEM Adriatic d.o.o.", country: "HR", regulations: ["MDR"] },
  { number: "2764", name: "Notice Belgelendirme, Muayene ve Denetim Hizmetleri A.Ş.", country: "TR", regulations: ["MDR"] },
  { number: "2797", name: "BSI Group The Netherlands B.V.", country: "NL", regulations: ["MDR", "IVDR"] },
  { number: "2803", name: "HTCert (Health Technology Certification Ltd)", country: "CY", regulations: ["MDR"] },
  { number: "2862", name: "Intertek Medical Notified Body AB", country: "SE", regulations: ["MDR"] },
  { number: "2962", name: "QMD Services GmbH", country: "AT", regulations: ["MDR", "IVDR"] },
  { number: "2975", name: "SZUTEST Konformitätsbewertungsstelle GmbH", country: "DE", regulations: ["MDR"] },
  { number: "3018", name: "Sertio Oy", country: "FI", regulations: ["IVDR"] },
  { number: "3022", name: "Scarlet NB B.V.", country: "NL", regulations: ["MDR"] },
  { number: "3033", name: "TÜV NORD Scandinavia Medical Notified Body AB", country: "SE", regulations: ["MDR"] },
  { number: "3121", name: "NOTICE, storitve ugotavljanja skladnosti, d.o.o.", country: "SI", regulations: ["MDR"] },
  { number: "3132", name: "Malta Conformity Assessment Ltd.", country: "MT", regulations: ["MDR"] },
];
