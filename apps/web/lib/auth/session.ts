import { getServerSession } from "next-auth";

import { authOptions } from "./auth";

export const getAccountantId = async (): Promise<string> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
};
