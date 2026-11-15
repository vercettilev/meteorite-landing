import { CONTACT_EMAIL } from "@/lib/site";
import { GlideLink } from "./GlideLink";
import { Logo, Mark } from "./Logo";

/*
  The foot of every page: one line under a hairline, the name on the left and on the right what
  must always be in reach. Our standards, the legal notice and the privacy notice have a page of
  their own (app/legal/page.tsx). On a phone the name is the mark alone. The links are plain
  links: leaving the home page stops its sound and its stone, and coming back to it loads it afresh.
*/
export function Footer({ page = "home" }: { page?: "home" | "legal" | "other" }) {
  const home = page === "home";
  const onLegal = page === "legal";
  /* On the home page the name travels back up through the cut, as the one in the top line does. */
  const name = "quiet-link -my-2 shrink-0 py-2 text-bone";
  const mark = (
    <>
      <Mark className="block h-6 w-6 sm:hidden" />
      <Logo width={120} className="hidden h-auto w-[7.5rem] sm:block" />
    </>
  );
  return (
    <footer className="mx-auto w-full max-w-[var(--wrap)] px-6 md:px-14">
      <div className="flex items-center justify-between gap-4 border-t border-bone/15 py-6 text-[0.9375rem] text-ash md:py-8">
        {home ? (
          <GlideLink href="#top" aria-label="Meteorite, back to top" className={name}>
            {mark}
          </GlideLink>
        ) : (
          <a href="/" aria-label="Meteorite, home" className={name}>
            {mark}
          </a>
        )}
        <ul role="list" className="flex min-w-0 items-center gap-x-5 whitespace-nowrap sm:gap-x-7 md:gap-x-8">
          {CONTACT_EMAIL && (
            <li className="hidden lg:block">
              <a href={`mailto:${CONTACT_EMAIL}`} className="quiet-link">
                {CONTACT_EMAIL}
              </a>
            </li>
          )}
          <li>
            <a
              href="/legal"
              aria-current={onLegal ? "page" : undefined}
              className={`quiet-link -my-2 inline-block py-2 ${onLegal ? "text-bone underline decoration-1 underline-offset-[0.3em]" : ""}`}
            >
              Legal
            </a>
          </li>
          <li>
            © 2026 Meteorite
          </li>
        </ul>
      </div>
    </footer>
  );
}
