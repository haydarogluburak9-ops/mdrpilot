import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const plans = [
  { key: "starter", name: "Starter", priceMonthly: 0, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 0 },
  { key: "basic", name: "Basic", priceMonthly: 250, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 500_000 },
  { key: "plus", name: "Plus", priceMonthly: 450, maxProducts: 3, maxSeats: 3, monthlyAiTokens: 1_500_000 },
  { key: "pro", name: "Pro", priceMonthly: 750, maxProducts: 5, maxSeats: 5, monthlyAiTokens: 2_500_000 },
  {
    key: "enterprise",
    name: "Enterprise",
    priceMonthly: 0,
    maxProducts: 9999,
    maxSeats: 9999,
    monthlyAiTokens: 50_000_000,
  },
];

for (const plan of plans) {
  await p.subscriptionPlan.upsert({ where: { key: plan.key }, create: plan, update: plan });
}
await p.subscriptionPlan.deleteMany({ where: { key: "free" } });

console.log("Subscription plans updated (Basic @ €250).");
await p.$disconnect();
