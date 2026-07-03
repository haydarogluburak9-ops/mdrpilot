import {
  LayoutDashboard,
  Boxes,
  FileStack,
  ListChecks,
  ShieldAlert,
  Stethoscope,
  Activity,
  FileText,
  BookMarked,
  Library,
  Wand2,
  Gauge,
  FolderUp,
  Download,
  PenLine,
  Settings,
  CreditCard,
  Sparkles,
  ClipboardCheck,
  LineChart,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Languages,
  ShieldCheck,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** i18n key, resolved with t() in the sidebar. */
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "nav.group.overview",
    items: [
      { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
      { labelKey: "nav.demo", href: "/demo/tour", icon: Sparkles },
      { labelKey: "nav.products", href: "/products", icon: Boxes },
    ],
  },
  {
    titleKey: "nav.group.regulatory",
    items: [
      { labelKey: "nav.technicalFile", href: "/technical-file", icon: FileStack },
      { labelKey: "nav.gspr", href: "/gspr", icon: ListChecks },
      { labelKey: "nav.risk", href: "/risk", icon: ShieldAlert },
      { labelKey: "nav.clinical", href: "/clinical", icon: Stethoscope },
      { labelKey: "nav.pms", href: "/pms", icon: Activity },
      { labelKey: "nav.ifu", href: "/ifu", icon: FileText },
    ],
  },
  {
    titleKey: "nav.group.intelligence",
    items: [
      { labelKey: "nav.consultant", href: "/consultant", icon: Sparkles },
      { labelKey: "nav.auditSimulator", href: "/audit-simulator", icon: ClipboardCheck },
      { labelKey: "nav.executive", href: "/executive", icon: LineChart },
      { labelKey: "nav.evaluation", href: "/evaluation", icon: Gauge },
      { labelKey: "nav.documentTranslator", href: "/document-translator", icon: Languages },
    ],
  },
  {
    titleKey: "nav.group.quality",
    items: [
      { labelKey: "nav.composer", href: "/composer", icon: PenLine },
      { labelKey: "nav.qmWizard", href: "/wizards/quality-manual", icon: Wand2 },
      { labelKey: "nav.standards", href: "/standards", icon: Library },
      { labelKey: "nav.qms", href: "/qms", icon: BookMarked },
      { labelKey: "nav.operational", href: "/operational", icon: ClipboardList },
      { labelKey: "nav.trainingMatrix", href: "/operational/training-matrix", icon: GraduationCap },
      { labelKey: "nav.analytics", href: "/analytics", icon: LineChart },
      { labelKey: "nav.docRegister", href: "/document-register", icon: FileStack },
      { labelKey: "nav.documentControl", href: "/document-control", icon: ShieldCheck },
      { labelKey: "nav.audit", href: "/audit", icon: Gauge },
      { labelKey: "nav.files", href: "/files", icon: FolderUp },
      { labelKey: "nav.exports", href: "/exports", icon: Download },
    ],
  },
  {
    titleKey: "nav.group.account",
    items: [
      { labelKey: "nav.help", href: "/help", icon: MessageSquare },
      { labelKey: "nav.activityLog", href: "/activity-log", icon: AlertTriangle },
      { labelKey: "nav.settings", href: "/settings", icon: Settings },
      { labelKey: "nav.billing", href: "/billing", icon: CreditCard },
    ],
  },
];
