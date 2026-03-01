import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          await prisma.user.upsert({
            where: { email: profile.email },
            update: {
              name: profile.name || user.name,
              image: user.image,
            },
            create: {
              email: profile.email,
              name: profile.name || user.name,
              image: user.image,
              emailVerified: (profile as any).email_verified ? new Date() : null,
            },
          });
          return true;
        } catch (error) {
          console.error("Error saving user to database:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
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
    async jwt({ token, account, profile }) {
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