import { decrypt, type EncryptedPayload, prisma } from "@repo/shared";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import * as OTPAuth from "otpauth";

const TOTP_ISSUER = "hexAIgon";
const BACKUP_CODE_COUNT = 8;

export const generateTotpSetup = (email: string): { secret: string; uri: string } => {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
};

export const verifyTotpCode = async (
  accountant: { id: string; totpSecret: string | null; backupCodes: string[] },
  code: string,
): Promise<boolean> => {
  // Try backup code first (if code is longer than 6 digits)
  if (code.length > 6) {
    return verifyBackupCode(accountant, code);
  }

  if (!accountant.totpSecret) return false;

  const encryptedSecret: EncryptedPayload = JSON.parse(accountant.totpSecret);
  const secret = decrypt(encryptedSecret);

  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: "",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
};

const verifyBackupCode = async (
  accountant: { id: string; backupCodes: string[] },
  code: string,
): Promise<boolean> => {
  for (let i = 0; i < accountant.backupCodes.length; i++) {
    if (bcrypt.compareSync(code, accountant.backupCodes[i])) {
      // Consume the code (one-time use)
      const updated = [...accountant.backupCodes];
      updated.splice(i, 1);
      await prisma.accountant.update({
        where: { id: accountant.id },
        data: { backupCodes: updated },
      });
      return true;
    }
  }
  return false;
};

export const generateBackupCodes = (): { plain: string[]; hashed: string[] } => {
  const plain = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    randomBytes(4).toString("hex").toUpperCase(),
  );
  const hashed = plain.map((c) => bcrypt.hashSync(c, 10));
  return { plain, hashed };
};
