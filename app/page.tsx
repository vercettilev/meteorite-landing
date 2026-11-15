import { Cut } from "@/components/Cut";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HeroStone } from "@/components/HeroStone";
import { WhyNow } from "@/components/WhyNow";

/*
  Runs before the stage is laid out. With motion allowed, the page takes the long layout the cut
  needs straight away, so a link to the form, or a reload, lands where it should. HeroStone.tsx
  takes it back if the stone cannot be drawn.
*/
const LIVE = `if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.cut="live"`;

export default function Home() {
  return (
    <>
      <main>
        <div className="stage" suppressHydrationWarning>
          <script dangerouslySetInnerHTML={{ __html: LIVE }} />
          <div className="stone-track">
            <HeroStone />
            <Hero />
            <Cut />
          </div>
          {/* Once the stone is let go, its stand runs on down to here. */}
          <div className="stone-foot" aria-hidden="true" />
        </div>
        <WhyNow />
      </main>
      <Footer />
    </>
  );
}
