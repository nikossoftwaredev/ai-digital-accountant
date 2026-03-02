import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { NextResponse, type NextRequest } from "next/server";

import { getAccountantId } from "@/lib/auth/session";

const DOWNLOADS_DIR = resolve(process.cwd(), "..", "..", "data", "downloads");

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) => {
  // Auth check — only logged-in accountants can download
  try {
    await getAccountantId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  // Sanitize filename — prevent path traversal
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (sanitized !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = resolve(DOWNLOADS_DIR, sanitized);

  // Ensure the resolved path is still within DOWNLOADS_DIR
  if (!filePath.startsWith(DOWNLOADS_DIR)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sanitized}"`,
    },
  });
};
