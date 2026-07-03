"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ClipboardCheck,
  Eye,
  Gauge,
  GitBranch,
  GraduationCap,
  MessageSquare,
  Package,
  ShieldAlert,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { OperationalModuleIconKey } from "@/lib/operational/modules";

const ICON_MAP: Record<OperationalModuleIconKey, LucideIcon> = {
  "clipboard-check": ClipboardCheck,
  "alert-octagon": AlertOctagon,
  "shield-alert": ShieldAlert,
  eye: Eye,
  "git-branch": GitBranch,
  users: Users,
  "graduation-cap": GraduationCap,
  truck: Truck,
  "alert-triangle": AlertTriangle,
  "message-square": MessageSquare,
  package: Package,
  gauge: Gauge,
};

export function OperationalModuleIcon({
  iconKey,
  className,
}: {
  iconKey: OperationalModuleIconKey;
  className?: string;
}) {
  const Icon = ICON_MAP[iconKey];
  return <Icon className={className} />;
}
