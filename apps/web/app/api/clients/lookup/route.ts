import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createLookupQueue } from "@repo/shared";
import type { Queue } from "bullmq";

import { authOptions } from "@/lib/auth/auth";

// ── Singleton Queue (HMR-safe via globalThis) ────────────────────

const getLookupQueue = () => {
  const key = "__lookupPostQueue" as keyof typeof globalThis;
  if (!globalThis[key]) {
    (globalThis as Record<string, unknown>)[key] = createLookupQueue();
  }
  return globalThis[key] as Queue;
};

// ── Route handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { taxisnetUsername, taxisnetPassword } = body;

  if (!taxisnetUsername || !taxisnetPassword)
    return NextResponse.json(
      { error: "Username and password required" },
      { status: 400 }
    );

  const jobId = crypto.randomUUID();
  const queue = getLookupQueue();

  await queue.add(
    "lookup",
    {
      jobId,
      accountantId: session.user.id,
      taxisnetUsername,
      taxisnetPassword,
    },
    { jobId }
  );

  return NextResponse.json({ jobId });
}
