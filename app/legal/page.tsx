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
  notice describes what the code does today (the waitlist form, the place and the link it gives,
  what a device is left to remember, the one email it sends through Resend, no cookies, no
  analytics); if that changes, this changes with it. The order of the list is the one lib/list.ts
  keeps and `npm run waitlist` prints: "Your place" says it, and the reveal has to be sent in it.
*/
const UPDATED = "18 November 2026";

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
    text: "If you join the waitlist: the email address you enter, your consent to be emailed, and when you joined. Nothing else is asked for. You are given a link of your own, and if you came by someone else's link, we keep which link it was. If you connect a wallet in the app, the page reads its public address in your browser to show your position; it is not sent to us or stored by us.",
  },
  {
    name: "Why",
    text: "To tell you that you are on the list, and to email you when the first specimen is revealed, as the form says. Your consent is the basis for it, and you can withdraw it at any time.",
  },
  {
    name: "Your place",
    text: "The list is kept in order of how many people each has brought by their link, most first, and among those who have brought the same number, in the order they joined. The reveal is sent in that order. Your link, and the card it shows when it is shared, say your place to anyone who has the link. They carry no name and no address.",
  },
  {
    name: "Who sees it",
    text: "Vercel, which keeps our list for us in private storage, and Resend, which sends our email for us. Both may handle it outside your country, including in the United States. No one else sees it, and we do not sell or share it.",
  },
  {
    name: "How long",
    text: "Until you ask us to remove it, or until we stop sending news of the launch, whichever comes first.",
  },
  {
    name: "Your rights",
    text: (
      <>
        Every email we send ends with a link that takes your address off the list at once. You can also ask us to show, correct or delete what we hold about you, or
        withdraw your consent, by writing to {write}, and you can complain to the data-protection authority where you live.
      </>
    ),
  },
  {
    name: "Cookies",
    text: "This site sets no cookies and uses no analytics or advertising trackers. Once you join, it remembers your link and your place on your device, to show them again, and until you close the tab, the link you came by. The app remembers on your device which wallet you last connected, so that it can connect it again. Clearing your browser's site data removes all of it.",
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
