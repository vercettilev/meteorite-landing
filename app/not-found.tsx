import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = { title: "Not found" };

/* Any address that leads nowhere: the site's own page, with the way back. Next.js sends it with a 404 and a noindex tag. */
export default function NotFound() {
  return (
    <div className="flex min-h-[calc(var(--svh)*100)] flex-col">
      <Nav home={false} />
      <main className="mx-auto grid w-full max-w-[var(--wrap)] flex-1 content-center px-6 py-20 md:px-14">
        <p className="label text-ash">404</p>
        <h1 className="mt-5 max-w-[12em] font-serif text-[clamp(2.75rem,7vw,5.5rem)] font-normal leading-[1.02]">Nothing landed here.</h1>
        <p className="mt-6 max-w-[30rem] text-ash">This address leads nowhere. The stone is where it always was.</p>
        <p className="mt-10">
          <a href="/" className="label quiet-link -my-3 inline-block py-3 text-bone/85 underline decoration-ash/40 underline-offset-4">
            Back to the stone
          </a>
        </p>
      </main>
      <Footer page="other" />
    </div>
  );
}
