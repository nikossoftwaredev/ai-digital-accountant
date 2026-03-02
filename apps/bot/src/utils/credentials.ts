import { decrypt, prisma, type EncryptedPayload } from "@repo/shared";
import { logger } from "./logger";

export interface ClientCredentials {
  username: string;
  password: string;
  amka: string | null;
}

export const getClientCredentials = async (
  clientId: string
): Promise<ClientCredentials> => {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      taxisnetUsername: true,
      taxisnetPassword: true,
      amka: true,
    },
  });

  if (!client.taxisnetUsername || !client.taxisnetPassword) {
    throw new Error(`Client ${clientId} has no TaxisNet credentials`);
  }

  const username = decrypt(
    JSON.parse(client.taxisnetUsername) as EncryptedPayload
  );
  const password = decrypt(
    JSON.parse(client.taxisnetPassword) as EncryptedPayload
  );

  logger.info({ clientId }, "Credentials decrypted");

  return { username, password, amka: client.amka };
};
