export type AdminCompanyMember = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  joinedAt: Date;
};

export type AdminCompanyRow = {
  companyId: string;
  companyName: string;
  country: string | null;
  createdAt: Date;
  planKey: string;
  planName: string;
  priceMonthly: number;
  productCount: number;
  memberCount: number;
  monthlyAiTokens: number;
  extraAiTokens: number;
  aiTokensUsed: number;
  aiTokensRemaining: number;
  members: AdminCompanyMember[];
};

export type AdminPendingUser = {
  userId: string;
  email: string;
  name: string | null;
  createdAt: Date;
  emailVerified: boolean;
};

export type AdminCustomerSummary = {
  totalUsers: number;
  totalCompanies: number;
  usersPendingOnboarding: number;
  planCounts: Record<string, number>;
};

export type AdminCustomersData = {
  companies: AdminCompanyRow[];
  pendingUsers: AdminPendingUser[];
  summary: AdminCustomerSummary;
};
