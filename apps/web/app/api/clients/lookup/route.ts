import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createLookupQueue } from "@repo/shared";

import { authOptions } from "@/lib/auth/auth";

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
  const queue = createLookupQueue();

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

  await queue.close();

  return NextResponse.json({ jobId });
}
