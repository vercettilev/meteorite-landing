import { JoinForm } from "./JoinForm";

/*
  After the cut the page closes as plainly as it can: the sale named over two of its lots, what
  each fetched and in four words what it is, one line on why that is rare, and the invitation
  again, for whoever read on past the field above. The stones are named in the source line under
  them. The figures are facts of one sale. When the market moves, change them here and keep the
  heading and the source line true.
*/
const SALE = "https://www.sothebys.com/en/buy/auction/2025/natural-history-2";
const SPHERE = "https://www.sothebys.com/en/buy/auction/2025/natural-history-2/lunar-meteorite-tisserlitine-006";

const LOTS = [
  { figure: "$5.3M", note: "A piece of Mars." },
  { figure: "$825,500", note: "A sphere of the Moon." },
];

export function WhyNow() {
  return (
    <section id="why-now" aria-labelledby="why-title" className="mx-auto max-w-[var(--wrap)] px-6 pb-20 pt-20 md:px-14 md:pb-28 md:pt-28">
      <h2 id="why-title" className="label text-ash">
        Sotheby&rsquo;s, New York, 16 July 2025
      </h2>
      <ul role="list" className="mt-10 grid gap-x-14 gap-y-12 md:mt-14 md:grid-cols-2">
        {LOTS.map((lot) => (
          <li key={lot.figure} className="border-t border-bone/20 pt-6">
            <p className="font-serif text-[clamp(3rem,5.2vw,5.25rem)] leading-none">{lot.figure}</p>
            <p className="mt-4 text-[1.0625rem] leading-snug text-ash">{lot.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-16 max-w-[46rem] font-serif text-[clamp(1.625rem,2.4vw,2.125rem)] italic leading-[1.25] md:mt-20">
        None of it has an open market.
      </p>
      <p className="mt-5 max-w-[46rem] text-[0.9375rem] leading-relaxed text-ash">
        <a href={SALE} className="quiet-link underline decoration-ash/40 underline-offset-4">
          Sotheby&rsquo;s Natural History
        </a>
        : NWA 16788 and{" "}
        <a href={SPHERE} className="quiet-link underline decoration-ash/40 underline-offset-4">
          Tisserlitine 006
        </a>
        . Prices include the buyer&rsquo;s premium.
      </p>
      {/* The invitation again, for whoever read this far. */}
      <div className="mt-20 flex flex-col gap-8 border-t border-bone/20 pt-10 md:mt-28 md:flex-row md:gap-14">
        <p className="font-serif text-[clamp(2.25rem,3.6vw,3.25rem)] leading-none">One small step.</p>
        <JoinForm id="close" />
      </div>
    </section>
  );
}
