import { Cut } from "@/components/Cut";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HeroStone } from "@/components/HeroStone";
import { ListPlate } from "@/components/ListPlate";
import { WhyNow } from "@/components/WhyNow";

/*
  Runs before the stage is laid out. With motion allowed, the page takes the long layout the cut
  needs straight away, so a link to the form, or a reload, lands where it should. HeroStone.tsx
  takes it back if the stone cannot be drawn. And if this device is already on the list, the
  fields are held back until their place can be said in their stead (lib/mine.ts), so the field
  never shows for a moment first.
*/
const LIVE = `if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.currentScript.parentElement.dataset.cut="live";try{if(localStorage.getItem("meteorite:list"))document.documentElement.dataset.listed=""}catch(e){}`;

/* The landing page. It is the home page, and it is what a link from the list opens (app/list/[code]/page.tsx): the same page, under a card of its own. */
export function Landing() {
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
      {/* The visitor's card, put before them as they join the list. */}
      <ListPlate />
    </>
  );
}
