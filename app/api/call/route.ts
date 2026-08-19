import { cfg, baseUrl, audioUrl } from "@/lib/config";
import { urlWith } from "@/lib/params";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const E164 = /^\+[1-9]\d{7,14}$/;

/** Diagnostics: confirms which settings are present without leaking secrets. */
export async function GET(req: Request) {
  const base = baseUrl(req);
  return Response.json({
    publicBaseUrl: base,
    reachableByPlivo: !/localhost|127\.0\.0\.1/.test(base),
    fromNumber: cfg.fromNumber,
    associateNumber: cfg.associateNumber,
    defaultTarget: cfg.targetNumber || null,
    audioUrl: { en: audioUrl("en", base), es: audioUrl("es", base) },
    otpConfigured: cfg.otpCode.length === 4,
    authIdSet: Boolean(cfg.authId),
    authTokenSet: Boolean(cfg.authToken),
    answerUrl: urlWith(base, "/api/ivr/answer", { attempt: 1 }),
  });
}

/** Places the outbound call via the Plivo REST API. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const to = (body.to ?? cfg.targetNumber ?? "").trim();
  const base = baseUrl(req);

  if (!E164.test(to)) {
    return Response.json(
      { error: `"${to}" is not a valid E.164 number. Use the +<country><number> format, e.g. +919876543210.` },
      { status: 400 },
    );
  }
  if (!cfg.authId || !cfg.authToken) {
    return Response.json(
      { error: "PLIVO_AUTH_ID / PLIVO_AUTH_TOKEN are not set. Add them to .env.local." },
      { status: 500 },
    );
  }
  if (/localhost|127\.0\.0\.1/.test(base)) {
    return Response.json(
      {
        error:
          "This app is running on localhost, which Plivo cannot reach. Start a tunnel " +
          "(cloudflared tunnel --url http://localhost:3000) and set PUBLIC_BASE_URL to the public URL.",
      },
      { status: 400 },
    );
  }

  const answerUrl = urlWith(base, "/api/ivr/answer", { attempt: 1 });
  const hangupUrl = urlWith(base, "/api/ivr/events", {});

  try {
    const plivo = await import("plivo");
    const client = new plivo.Client(cfg.authId, cfg.authToken);
    const res = await client.calls.create(cfg.fromNumber, to, answerUrl, {
      answerMethod: "POST",
      hangupUrl,
      hangupMethod: "POST",
    });
    console.log("[plivo:call] created", { to, requestUuid: res.requestUuid });
    return Response.json({ ok: true, to, from: cfg.fromNumber, answerUrl, requestUuid: res.requestUuid, message: res.message });
  } catch (err: unknown) {
    const e = err as { message?: string; error?: string; statusCode?: number };
    const message = e?.error ?? e?.message ?? "Unknown error from the Plivo API.";
    console.error("[plivo:call] failed", message);
    return Response.json({ error: message, statusCode: e?.statusCode ?? 502 }, { status: 502 });
  }
}
