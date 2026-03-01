import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@repo/shared";

export const authOptions: NextAuthOptions = {
  // TODO: Replace with CredentialsProvider for email+password auth
  providers: [],
  callbacks: {
    async session({ session }) {
      if (session.user?.email) {
        const accountant = await prisma.accountant.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true, name: true, image: true },
        });
        if (accountant)
          session.user = {
            ...session.user,
            id: accountant.id,
          };
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) token.accessToken = account.access_token;
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
