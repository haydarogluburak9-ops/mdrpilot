import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const logs = await p.auditLog.findMany({
    where: {
      OR: [
        { action: { contains: "AI", mode: "insensitive" } },
        { action: { contains: "composer", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { action: true, createdAt: true, metadata: true },
  });
  console.log("=== Recent AI/composer audit logs ===");
  for (const l of logs) {
    console.log(l.createdAt.toISOString(), l.action, JSON.stringify(l.metadata).slice(0, 200));
  }

  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const base = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-5";
  if (!key) {
    console.log("\nNo API key configured.");
    return;
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_completion_tokens: 20,
      reasoning_effort: "minimal",
    }),
  });
  const text = await res.text();
  console.log(`\n=== OpenAI test (${model}) ===`);
  console.log(`HTTP ${res.status}`);
  console.log(text.slice(0, 400));
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());
