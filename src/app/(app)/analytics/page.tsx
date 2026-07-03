import { requireCompany } from "@/lib/auth/guards";
import { AnalyticsTrendsView } from "@/components/analytics/analytics-trends-view";

export default async function AnalyticsPage() {
  await requireCompany();
  return <AnalyticsTrendsView />;
}
