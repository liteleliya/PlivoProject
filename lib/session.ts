import crypto from "node:crypto";
import { cfg } from "./config";

/**
 * The flow is stateless: state travels in webhook URLs, which would leave the
 * menu routes directly callable. A correct OTP mints an HMAC over the
 * CallUUID; every menu route requires it, so the IVR is unreachable without
 * authenticating first.
 */
export function signSession(callUuid: string): string {
  return crypto
    .createHmac("sha256", cfg.sessionSecret)
    .update(`authenticated:${callUuid}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifySession(callUuid: string, token: string | null): boolean {
  if (!token) return false;
  const expected = signSession(callUuid);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
