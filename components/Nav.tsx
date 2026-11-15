import { GlideLink } from "./GlideLink";
import { Logo } from "./Logo";
import { SoundToggle } from "./SoundToggle";

/*
  The top line of every page. On the home page its links travel along the page (GlideLink) and the
  sound can be turned on. Elsewhere they lead back to the home page, which is loaded afresh, so the
  cut is set up before the page lands on the field.
*/
const STEP = "label quiet-link -my-3 whitespace-nowrap py-3 text-bone/85";

export function Nav({ home = true }: { home?: boolean }) {
  /* On the narrowest phones the name is drawn smaller and the links sit closer, so the line never runs into itself (Sound shows from 375px). */
  const logo = <Logo eager className="h-auto w-[7rem] min-[420px]:w-[8.25rem] sm:w-[10.75rem]" />;
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-[var(--wrap)] items-center justify-between gap-4 px-6 py-6 md:px-14 md:py-8">
        {home ? (
          <GlideLink href="#top" aria-label="Meteorite, back to top" className="shrink-0">
            {logo}
          </GlideLink>
        ) : (
          <a href="/" aria-label="Meteorite, home" className="shrink-0">
            {logo}
          </a>
        )}
        <div className="flex shrink-0 items-center gap-4 min-[420px]:gap-6 md:gap-8">
          {home && <SoundToggle />}
          {home ? (
            /* It travels down through the cut to the form, and with a mouse leaves the cursor in the field. */
            <GlideLink href="#join" field='input[name="email"]' className={STEP}>
              One small step
            </GlideLink>
          ) : (
            <a href="/#join" className={STEP}>
              One small step
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
