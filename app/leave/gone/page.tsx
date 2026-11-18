import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = { title: "Off the list", robots: { index: false, follow: false } };

/* What the button on /leave leads to: the address is off the list, and this says so. */
export default function Gone() {
  return (
    <div className="flex min-h-[calc(var(--svh)*100)] flex-col">
      <Nav home={false} />
      <main className="mx-auto grid w-full max-w-[var(--wrap)] flex-1 content-center px-6 py-20 md:px-14">
        <p className="label text-ash">The list</p>
        <h1 className="mt-5 max-w-[14em] font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-[1.04]">Your address is off the list.</h1>
        <p className="mt-6 max-w-[30rem] text-ash">We will not write to you again. The stone is where it always was.</p>
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
