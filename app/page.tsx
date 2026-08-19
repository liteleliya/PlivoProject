"use client";

import { useEffect, useState } from "react";

type Diag = {
  publicBaseUrl: string;
  reachableByPlivo: boolean;
  fromNumber: string;
  associateNumber: string;
  defaultTarget: string | null;
  authIdSet: boolean;
  authTokenSet: boolean;
  answerUrl: string;
};

export default function Home() {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [diag, setDiag] = useState<Diag | null>(null);

  useEffect(() => {
    fetch("/api/call")
      .then((r) => r.json())
      .then((d: Diag) => {
        setDiag(d);
        if (d.defaultTarget) setTo(d.defaultTarget);
      })
      .catch(() => {});
  }, []);

  async function placeCall(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      setResult(
        res.ok
          ? { ok: true, text: `Calling ${data.to} from ${data.from}. Request UUID: ${data.requestUuid}` }
          : { ok: false, text: data.error ?? "Call failed." },
      );
    } catch (err) {
      setResult({ ok: false, text: String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Plivo IVR Demo</h1>
          <p className="mt-2 text-neutral-400">
            Places an outbound call, authenticates the caller with a 4-digit OTP, then serves a
            two-level IVR menu.
          </p>
        </header>

        <form onSubmit={placeCall} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <label htmlFor="to" className="block text-sm font-medium text-neutral-300">
            Destination number
          </label>
          <div className="mt-2 flex gap-3">
            <input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+919876543210"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 font-mono
                         outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={busy || !to}
              className="rounded-lg bg-white px-5 py-2.5 font-medium text-neutral-900
                         disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-200"
            >
              {busy ? "Calling…" : "Place call"}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">E.164 format, including the country code.</p>

          {result && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                result.ok
                  ? "border-emerald-800 bg-emerald-950/50 text-emerald-200"
                  : "border-red-900 bg-red-950/50 text-red-200"
              }`}
            >
              {result.text}
            </div>
          )}
        </form>

        <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Call flow</h2>
          <ol className="mt-4 space-y-3 text-sm text-neutral-300">
            <li><span className="text-neutral-500">1.</span> Outbound call is answered</li>
            <li><span className="text-neutral-500">2.</span> Caller enters the 4-digit OTP; wrong entries re-prompt</li>
            <li><span className="text-neutral-500">3.</span> Level 1: press <b>1</b> English, <b>2</b> Spanish</li>
            <li><span className="text-neutral-500">4.</span> Level 2: press <b>1</b> to play audio, <b>2</b> to reach an associate</li>
          </ol>
        </section>

        {diag && (
          <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Configuration</h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-xs">
              <dt className="text-neutral-500">From</dt><dd>{diag.fromNumber}</dd>
              <dt className="text-neutral-500">Associate</dt><dd>{diag.associateNumber}</dd>
              <dt className="text-neutral-500">Public URL</dt>
              <dd className={diag.reachableByPlivo ? "text-emerald-400" : "text-amber-400"}>
                {diag.publicBaseUrl}{diag.reachableByPlivo ? "" : "  (not reachable by Plivo)"}
              </dd>
              <dt className="text-neutral-500">Credentials</dt>
              <dd className={diag.authIdSet && diag.authTokenSet ? "text-emerald-400" : "text-red-400"}>
                {diag.authIdSet && diag.authTokenSet ? "loaded" : "missing"}
              </dd>
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
