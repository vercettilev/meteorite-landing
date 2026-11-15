import { Nav } from "./Nav";

export function Hero() {
  return (
    <section id="top" className="hero relative flex flex-col">
      <Nav />

      <div className="relative mx-auto flex w-full max-w-[var(--wrap)] flex-1 flex-col px-6 pt-8 md:px-14 md:pt-0">
        <div className="hero-copy settle">
          <h1 className="hero-title font-serif font-normal">
            Own a piece
            <br />
            of space.
          </h1>
          <p className="mt-7 font-serif text-[clamp(1.5rem,2.1vw,1.875rem)] leading-[1.2]">
            <span className="sr-only">Real space assets.</span>
            <span aria-hidden="true">
              Real{" "}
              <span className="struck">
                world
                <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M-3 18.6C13 15.9 29 18.7 52 16.2S87 13.6 104 13.1L104 14.5C87 15.5 71 17.6 52 17.9S15 17.5-3 20Z" fill="currentColor" />
                </svg>
              </span>
              <span className="inserted">space</span> assets.
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="label text-ash">Coming to Solana.</p>
            {/* On a phone the stone's hint shows here, where it is seen before any scrolling. HeroStone.tsx fills it. */}
            <div className="hero-hint" data-stone-hint />
          </div>
        </div>
      </div>
    </section>
  );
}
