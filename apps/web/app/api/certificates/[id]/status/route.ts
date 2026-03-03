import { prisma } from "@repo/shared";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const request = await prisma.certificateRequest.findFirst({
    where: { id, accountantId: session.user.id },
    include: {
      files: {
        select: { id: true, fileName: true, fileUrl: true, fileType: true },
      },
    },
  });

  if (!request)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    request: {
      id: request.id,
      clientId: request.clientId,
      certificateType: request.certificateType,
      status: request.status,
      params: request.params,
      startedAt: request.startedAt?.toISOString() ?? null,
      completedAt: request.completedAt?.toISOString() ?? null,
      errorMessage: request.errorMessage,
      errorType: request.errorType,
      createdAt: request.createdAt.toISOString(),
      files: request.files,
    },
  });
};
