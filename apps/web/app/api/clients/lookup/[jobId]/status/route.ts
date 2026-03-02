import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Queue } from "bullmq";
import {
  LOOKUP_QUEUE_NAME,
  getRedisConnectionOptions,
  type LookupJobResult,
} from "@repo/shared";

import { authOptions } from "@/lib/auth/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;

  const queue = new Queue(LOOKUP_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
  });

  try {
    const job = await queue.getJob(jobId);

    if (!job)
      return NextResponse.json({ status: "not_found" }, { status: 404 });

    // Verify ownership
    if (job.data.accountantId !== session.user.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const state = await job.getState();

    if (state === "completed") {
      const result = job.returnvalue as LookupJobResult;
      return NextResponse.json({ status: "completed", data: result });
    }

    if (state === "failed") {
      return NextResponse.json({
        status: "failed",
        error: job.failedReason ?? "Unknown error",
      });
    }

    return NextResponse.json({ status: "pending" });
  } finally {
    await queue.close();
  }
}
