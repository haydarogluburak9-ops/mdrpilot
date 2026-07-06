export interface AdminUserRow {
  userId: string;
  email: string;
  name: string | null;
  createdAt: Date;
  emailVerified: boolean;
  companyId: string | null;
  companyName: string | null;
  role: string | null;
  planKey: string;
  planName: string;
  activeDemo: boolean;
}

export interface AdminUsersData {
  users: AdminUserRow[];
  summary: {
    total: number;
    withCompany: number;
    withoutCompany: number;
  };
}
