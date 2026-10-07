"use client";

import { useState, useTransition } from "react";
import { signInWithEmail } from "@/app/actions";

export function LoginForm({ today }: { today: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[#0E0F11] text-[#F2F1EC] lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_110%,rgba(255,107,91,0.14),transparent_70%)]" />
      <div className="relative flex flex-col justify-between px-8 py-10 md:px-12 md:py-12" style={{ animation: "fade .9s ease both" }}>
        <div className="eyebrow">Private · Privacy search</div>
        <div className="py-16">
          <div className="display -ml-[0.04em] text-[clamp(72px,12vw,160px)] leading-[0.85]">
            nigelsninja<span className="text-[#FF6B5B]">.</span>
          </div>
          <p className="mt-7 max-w-[38ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.72)]">
            Your LinkedIn search, and a letter when a role is worth your time. <em className="text-[#F2F1EC] italic">You are the one who sends it.</em>
          </p>
        </div>
        <div className="font-mono text-[11px] tracking-[0.08em] text-[rgba(242,241,236,0.4)]">{today}</div>
      </div>
      <div
        className="relative flex items-center justify-center border-t border-[rgba(242,241,236,0.08)] px-8 py-16 md:px-12 lg:border-t-0 lg:border-l"
        style={{ animation: "rise .9s cubic-bezier(.2,.8,.2,1) .15s both" }}
      >
        <form
          className="flex w-full max-w-[380px] flex-col gap-7"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setError(null);
            setMessage(null);
            setLink(null);
            start(async () => {
              const result = await signInWithEmail(data);
              if (!result.ok) setError(result.message);
              else {
                setMessage(result.message ?? null);
                setLink(result.link ?? null);
              }
            });
          }}
        >
          <div>
            <label htmlFor="email" className="eyebrow mb-3 block">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full border-0 border-b border-[rgba(242,241,236,0.35)] bg-transparent px-0 pt-2.5 pb-3.5 font-sans text-2xl text-[#F2F1EC] outline-none focus:border-[#F2F1EC]"
            />
            <div className="mt-3 font-mono text-[11px] tracking-[0.02em] text-[rgba(242,241,236,0.4)]">nigel@nigeldown.com or mail@michaeldown.co.uk</div>
          </div>
          <button type="submit" disabled={pending} className="pill pill-coral self-start">
            {pending ? "Checking…" : "Continue"} <span className="font-mono text-sm">→</span>
          </button>
          {error ? <p className="text-sm leading-6 text-[#B3261E]">{error}</p> : null}
          {message ? <p className="text-sm leading-6 text-[rgba(242,241,236,0.72)]">{message}</p> : null}
          {link ? (
            <a href={link} className="font-[family-name:var(--font-bricolage)] text-4xl font-bold tracking-tight text-[#F2F1EC] underline decoration-[rgba(242,241,236,0.3)] underline-offset-8">
              Sign in
            </a>
          ) : null}
        </form>
      </div>
    </div>
  );
}
