import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CONTACT_EMAIL, STONE_PHOTO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Legal",
  description: "Meteorite's standards, its legal notice, and how it treats your data.",
  alternates: { canonical: "/legal" },
};

/*
  Our standards, the legal notice and the privacy notice. Every line here is a claim: keep each one
  true, have it reviewed by counsel, and change the date when any of them changes. The privacy
  notice describes what the code does today (the waitlist form, no cookies, no analytics); if that
  changes, this changes with it.
*/
const UPDATED = "12 November 2026";

const STANDARDS = [
  { name: "Vault", text: "Insured storage, with dated checks you can read." },
  { name: "Authenticate", text: "Every stone documented before it is shown." },
  { name: "Preserve", text: "Kept with care, for as long as it is held." },
];

const NOTICE = [
  "Meteorite has no token. Any token using this name is not ours. We are not affiliated with Meteora.",
  "Meteorite is an early-stage project. Nothing here is an offer to sell securities, tokens or any interest in a meteorite, or financial advice.",
];

const write = CONTACT_EMAIL ? (
  <a href={`mailto:${CONTACT_EMAIL}`} className="quiet-link text-bone/85 underline decoration-ash/40 underline-offset-4">
    {CONTACT_EMAIL}
  </a>
) : (
  "the address given here when the list opens"
);

const PRIVACY: { name: string; text: ReactNode }[] = [
  {
    name: "What we collect",
    text: "If you join the waitlist: the email address you enter, and your consent to be emailed. Nothing else is asked for. If you connect a wallet in the app, the page reads its public address in your browser to show your position; it is not sent to us or stored by us.",
  },
  {
    name: "Why",
    text: "Only to email you when the first specimen is revealed, as the form says. Your consent is the basis for it, and you can withdraw it at any time.",
  },
  {
    name: "Who sees it",
    text: "Vercel, which keeps our list for us in private storage, and no one else. If we use a service to send the email, it acts for us too. We do not sell or share it.",
  },
  {
    name: "How long",
    text: "Until you ask us to remove it, or until we stop sending news of the launch, whichever comes first.",
  },
  {
    name: "Your rights",
    text: (
      <>
        You can ask us to show, correct or delete what we hold about you, or withdraw your consent, by writing to {write}. You can also complain to the data-protection
        authority where you live.
      </>
    ),
  },
  {
    name: "Cookies",
    text: "This site sets no cookies and uses no analytics or advertising trackers. The app remembers on your device which wallet you last connected, so that it can connect it again; clearing your browser's site data removes it.",
  },
  {
    name: "Hosting",
    text: "The site is served by Vercel, which handles technical data such as IP addresses to deliver it and keep it secure, and may do so outside your country, including in the United States.",
  },
  {
    name: "On Solana",
    text: "Anything done on Solana is recorded on a public blockchain: anyone can see it, and no one, including us, can change or delete it.",
  },
];

/* One part of the page: its name on the left, under a hairline, and what it says on the right. On a phone the name sits above. */
function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-8 grid-cols-1 gap-x-14 gap-y-5 border-t border-bone/20 pt-6 md:grid-cols-[minmax(10rem,16rem)_minmax(0,46rem)] md:pt-8">
      <h2 id={`${id}-title`} className="label text-ash">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

/* A list of named lines: the name in the serif, what it says beneath it in ash. */
function Terms({ items }: { items: { name: string; text: ReactNode }[] }) {
  return (
    <dl className="space-y-6">
      {items.map((item) => (
        <div key={item.name}>
          <dt className="font-serif text-[clamp(1.5rem,2.2vw,1.875rem)] leading-tight">{item.name}</dt>
          <dd className="mt-1 max-w-[40rem] text-[1.0625rem] leading-snug text-ash">{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Legal() {
  return (
    <div className="flex min-h-[calc(var(--svh)*100)] flex-col">
      <Nav home={false} />
      <main className="mx-auto w-full max-w-[var(--wrap)] flex-1 px-6 pb-20 pt-10 md:px-14 md:pb-28 md:pt-20">
        <h1 className="font-serif text-[clamp(3rem,7vw,5.5rem)] font-normal leading-none">Legal</h1>
        <p className="label mt-5 text-ash">Updated {UPDATED}</p>

        <div className="mt-14 space-y-14 md:mt-20 md:space-y-20">
          <Part id="standards" title="Our standards">
            <Terms items={STANDARDS} />
          </Part>

          <Part id="notice" title="Legal notice">
            <div className="max-w-[40rem] space-y-4 leading-relaxed text-bone/85">
              {NOTICE.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </Part>

          <Part id="credits" title="Credits">
            <p className="max-w-[40rem] leading-relaxed text-bone/85">
              The stone on this site is drawn from a{" "}
              <a href={STONE_PHOTO.url} className="quiet-link underline decoration-ash/40 underline-offset-4">
                photograph
              </a>{" "}
              of the lunar meteorite NWA 10665 by {STONE_PHOTO.author}, adapted under{" "}
              <a href={STONE_PHOTO.licenceUrl} className="quiet-link underline decoration-ash/40 underline-offset-4">
                {STONE_PHOTO.licence}
              </a>
              .
            </p>
          </Part>

          <Part id="privacy" title="Privacy">
            <Terms items={PRIVACY} />
          </Part>

          {CONTACT_EMAIL && (
            <Part id="contact" title="Contact">
              <a href={`mailto:${CONTACT_EMAIL}`} className="quiet-link break-all underline decoration-ash/40 underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            </Part>
          )}
        </div>
      </main>
      <Footer page="legal" />
    </div>
  );
}
