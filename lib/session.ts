import crypto from "node:crypto";
import { cfg } from "./config";

/**
 * The IVR is stateless - no database, per the assignment. To make sure the
 * menu routes cannot simply be hit directly without passing the OTP gate, we
 * mint a short HMAC over the CallUUID once the correct OTP is entered and
 * carry it through the remaining webhook hops as a query parameter.
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
