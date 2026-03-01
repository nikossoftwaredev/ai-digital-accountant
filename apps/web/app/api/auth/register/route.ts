import { prisma } from "@repo/shared";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";

export const POST = async (req: NextRequest) => {
  // For initial setup, allow registration when no accountants exist
  const count = await prisma.accountant.count();

  if (count > 0) {
    // After first user, require admin auth
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.accountant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  const accountant = await prisma.accountant.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json(accountant, { status: 201 });
};
