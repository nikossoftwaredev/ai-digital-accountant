import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  // TODO: Replace with CredentialsProvider for email+password auth
  providers: [],
  callbacks: {
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true, name: true, image: true },
        });
        if (dbUser)
          session.user = {
            ...session.user,
            id: dbUser.id,
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
