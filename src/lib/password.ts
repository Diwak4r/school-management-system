import crypto from "crypto";

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(12).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(hash) || hash.length % 2 !== 0) {
    return false;
  }

  const test = crypto.scryptSync(pw, salt, 64).toString("hex");
  const storedBuffer = Buffer.from(hash, "hex");
  const testBuffer = Buffer.from(test, "hex");
  if (storedBuffer.length !== testBuffer.length) return false;

  return crypto.timingSafeEqual(storedBuffer, testBuffer);
}
