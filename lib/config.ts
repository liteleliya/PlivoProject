export const cfg = {
  authId: process.env.PLIVO_AUTH_ID ?? "",
  authToken: process.env.PLIVO_AUTH_TOKEN ?? "",
  fromNumber: process.env.PLIVO_FROM_NUMBER ?? "+918035454161",
  associateNumber: process.env.ASSOCIATE_NUMBER ?? "+912264236412",
  /** 4-digit OTP: birthdate in DDMM, hardcoded per the assignment. */
  otpCode: process.env.OTP_CODE ?? "2008",
  targetNumber: process.env.TARGET_NUMBER ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  audioUrlOverride: {
    en: process.env.AUDIO_URL_EN ?? "",
    es: process.env.AUDIO_URL_ES ?? "",
  },
};

/**
 * Base URL for the webhook URLs handed to Plivo. Falls back to the incoming
 * request's host, so one build works behind a tunnel and on Vercel.
 */
export function baseUrl(req: Request): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Level 2 audio in the caller's language, self-hosted unless overridden. */
export function audioUrl(lang: "en" | "es", base: string): string {
  return cfg.audioUrlOverride[lang] || `${base}/audio/message-${lang}.mp3`;
}

/**
 * One second of silence. <GetDigits> only permits <Speak> and <Play> children,
 * so pacing between prompts comes from playing a silent clip.
 */
export function pauseUrl(base: string): string {
  return `${base}/audio/silence-1s.mp3`;
}
