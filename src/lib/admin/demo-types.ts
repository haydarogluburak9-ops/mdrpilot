import type { DemoAccessStatus } from "@/lib/demo/access";

export type AdminDemoGrantRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  companyId: string;
  companyName: string;
  trialPlanKey: string;
  expiresAt: Date;
  revokedAt: Date | null;
  status: DemoAccessStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  daysRemaining: number;
};

export type AdminDemoData = {
  grants: AdminDemoGrantRow[];
  summary: {
    active: number;
    expired: number;
    revoked: number;
  };
};
