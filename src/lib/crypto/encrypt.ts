import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptText(value: string, secret: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptText(payload: string, secret: string) {
  const [ivHex, encryptedHex] = payload.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format.");
  }

  const decipher = createDecipheriv("aes-256-cbc", getKey(secret), Buffer.from(ivHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);

  return decrypted.toString("utf8");
}
