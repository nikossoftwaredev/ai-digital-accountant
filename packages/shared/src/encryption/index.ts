import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string;         // hex (12 bytes)
  tag: string;        // hex (16 bytes auth tag)
}

const getMasterKey = (): Buffer => {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex) {
    throw new Error("ENCRYPTION_MASTER_KEY environment variable is not set");
  }
  const key = Buffer.from(hex, "hex");
  if (key.byteLength !== 32) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be exactly 32 bytes (64 hex characters)"
    );
  }
  return key;
};

export const encrypt = (plaintext: string): EncryptedPayload => {
  const key = getMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
};

export const decrypt = (payload: EncryptedPayload): string => {
  const key = getMasterKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
