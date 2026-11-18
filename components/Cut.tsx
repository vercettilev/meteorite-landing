import type { CSSProperties } from "react";
import { CLAIMS } from "@/lib/share";
import { JoinForm } from "./JoinForm";
import { Logo } from "./Logo";

/*
  What the page says while the stone is cut: three claims, each one able to stand alone, then the
  name and the field for an email. Without the live stone this is a plain passage of text with the
  field at its end. With it, each shows in turn while the stone is cut: "from" and "to" are how far
  through the cut it stays, and keep time with beats() in HeroStone.tsx. Once a stone is held, the
  third line can become "We found it." The claims themselves are kept in lib/share.ts, because a
  post on X opens with one of them.
*/
const STEPS = [
  { text: CLAIMS[0], from: 0.16, to: 0.34 },
  { text: CLAIMS[1], from: 0.42, to: 0.62 },
  { text: CLAIMS[2], from: 0.66, to: 0.78 },
];

const shown = (from: number, to: number) => ({ "--from": from, "--to": to }) as CSSProperties;

export function Cut() {
  return (
    <section className="cut" aria-labelledby="cut-title">
      <div className="cut-text mx-auto max-w-[var(--wrap)] px-6 md:px-14">
        {STEPS.map((step) => (
          <p key={step.text} className="cut-step cut-line font-serif" style={shown(step.from, step.to)}>
            {step.text}
          </p>
        ))}
        <div className="cut-step cut-join" style={shown(0.82, 2)}>
          <Logo width={150} className="cut-join-logo" />
          <h2 id="cut-title" className="cut-line font-serif font-normal">
            One small step.
          </h2>
          <JoinForm />
        </div>
      </div>
      {/* Where "One small step" lands. With the live stone that is the point of the scroll where the mark has formed. */}
      <div id="join" className="join-anchor" />
    </section>
  );
}
