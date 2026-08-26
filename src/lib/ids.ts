import { randomBytes, randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

const TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

/** Short, human-typeable code for QR encoding / manual entry fallback at the register. */
export function newOrderToken(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}
