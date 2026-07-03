/**
 * CLI wrapper — requires dev server: POST /api/qms/bootstrap-pack with auth cookie
 * Or run via authenticated session in browser.
 *
 * For local automation without auth, use: npx tsx scripts/run-bootstrap-via-prisma.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dynamic import after setting up — use inline prisma-only status update if server-only blocks
  console.log("Use POST /api/qms/bootstrap-pack from the app (logged in as CONSULTANT+)");
  console.log("Or: npm run dev then call bootstrap from QMS page button.");

  const company = await prisma.company.findFirst({ select: { id: true, name: true } });
  if (company) console.log(`Company: ${company.name} (${company.id})`);
}

main().finally(() => prisma.$disconnect());
