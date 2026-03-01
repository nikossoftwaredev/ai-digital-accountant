import { prisma } from "@repo/shared";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { logAuditEvent } from "./audit";
import { checkRateLimit, incrementFailedAttempts, resetFailedAttempts } from "./rate-limit";
import { verifyTotpCode } from "./totp";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const accountant = await prisma.accountant.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            totpEnabled: true,
            totpSecret: true,
            backupCodes: true,
            failedAttempts: true,
            lockedUntil: true,
          },
        });

        if (!accountant || !accountant.passwordHash) {
          return null;
        }

        // Rate limit check
        const rateLimitOk = await checkRateLimit(accountant);
        if (!rateLimitOk) {
          throw new Error("AccountLocked");
        }

        // Password check
        const passwordOk = bcrypt.compareSync(credentials.password, accountant.passwordHash);
        if (!passwordOk) {
          await incrementFailedAttempts(accountant.id);
          await logAuditEvent({
            accountantId: accountant.id,
            action: "LOGIN_FAILED",
            details: { reason: "bad_password" },
          });
          return null;
        }

        // TOTP check (if enabled)
        if (accountant.totpEnabled) {
          if (!credentials.totpCode) {
            throw new Error("TotpRequired");
          }
          const totpOk = await verifyTotpCode(accountant, credentials.totpCode);
          if (!totpOk) {
            await logAuditEvent({
              accountantId: accountant.id,
              action: "LOGIN_FAILED",
              details: { reason: "bad_totp" },
            });
            throw new Error("InvalidTotp");
          }
        }

        await resetFailedAttempts(accountant.id);
        await logAuditEvent({
          accountantId: accountant.id,
          action: "LOGIN",
        });

        return {
          id: accountant.id,
          email: accountant.email,
          name: accountant.name,
          image: accountant.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15-minute session
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
