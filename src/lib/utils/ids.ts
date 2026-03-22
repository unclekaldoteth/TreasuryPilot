import { createHash, randomUUID } from "crypto";

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function createDeterministicHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
