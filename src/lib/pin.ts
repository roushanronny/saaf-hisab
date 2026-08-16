import crypto from "crypto";

export function hashPin(pin: string) {
  return crypto.createHash("sha256").update(`saaf:${pin}`).digest("hex");
}

export function verifyPin(pin: string, hash: string | null | undefined) {
  if (!hash) return true; // no pin set = open
  return hashPin(pin) === hash;
}
