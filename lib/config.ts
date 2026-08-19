/** Central configuration, read from environment. */
export const cfg = {
  authId: process.env.PLIVO_AUTH_ID ?? "",
  authToken: process.env.PLIVO_AUTH_TOKEN ?? "",
  fromNumber: process.env.PLIVO_FROM_NUMBER ?? "+918035454161",
  associateNumber: process.env.ASSOCIATE_NUMBER ?? "+912264236412",
  /** 4-digit OTP: birthdate in DDMM. Hardcoded per the assignment - no database. */
  otpCode: process.env.OTP_CODE ?? "2008",
  targetNumber: process.env.TARGET_NUMBER ?? "",
  audioUrl: process.env.AUDIO_URL ?? "https://s3.amazonaws.com/plivocloud/music.mp3",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  /** Cap on OTP re-prompts so a stuck call cannot loop forever. */
  maxOtpAttempts: 5,
};

/**
 * Public base URL used to build absolute webhook URLs for Plivo.
 * Falls back to the incoming request's host so the same code works behind a
 * cloudflared tunnel and on Vercel with no configuration change.
 */
export function baseUrl(req: Request): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
