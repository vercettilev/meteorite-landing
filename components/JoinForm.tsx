"use client";

import { useState, type FormEvent } from "react";

/* The site's own route (app/api/waitlist) unless another service is named. */
const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT || "/api/waitlist";

/* The field for an email: at the end of the cut (Cut.tsx), and again at the foot of the page (WhyNow.tsx). id keeps each one's status line its own. */
export function JoinForm({ id = "join" }: { id?: string }) {
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    /* A refusal puts the visitor on the field that needs them. On a phone that also folds the keyboard away from the message. */
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ text: "Enter a valid email address.", error: true });
      field("email").focus();
      return;
    }
    if (!data.get("consent")) {
      setStatus({ text: "Tick the box so we can email you.", error: true });
      field("consent").focus();
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus({ text: "You will be the first to know." });
    } catch {
      setStatus({ text: "We could not add you. Please try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-[24rem]">
      <div className="field flex items-end border-b border-bone/35">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email"
          aria-label="Email address"
          aria-describedby={`${id}-status`}
          className="h-12 min-w-0 flex-1 rounded-none border-0 bg-transparent text-[1.125rem] text-bone placeholder:italic placeholder:text-ash"
        />
        <button type="submit" disabled={busy} className="label quiet-link h-12 shrink-0 pl-4 disabled:opacity-50">
          {busy ? "Adding" : "Notify me"}
        </button>
      </div>
      <label className="mt-4 flex items-start gap-3 text-[0.9375rem] leading-snug text-ash">
        <input type="checkbox" name="consent" className="mt-[2px] h-3.5 w-3.5 shrink-0 accent-[#E9E3D6]" />
        <span>
          Email me when the first specimen is revealed. I can ask to be removed at any time.{" "}
          <a href="/legal#privacy" className="quiet-link whitespace-nowrap underline decoration-ash/40 underline-offset-[0.2em]">
            Privacy
          </a>
        </span>
      </label>
      <p id={`${id}-status`} role="status" className={`mt-3 min-h-5 text-[1rem] ${status?.error ? "text-[#E09A8B]" : "text-bone/85"}`}>
        {status?.text}
      </p>
    </form>
  );
}
