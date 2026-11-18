import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { leaving } from "@/lib/list";

/*
  Where the link at the foot of an email leads: one question, and the button that takes the
  address off the list. Opening the page does nothing by itself, since mail scanners open every
  link; the button posts to app/api/list/leave. The address of this page is a secret between the
  site and one inbox (lib/list.ts), so it stays out of search and is never kept by a cache.
*/
export const metadata: Metadata = { title: "Leave the list", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Leave({ params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  /* If the list cannot be read just now, the button is offered anyway: pressing it asks again. */
  const there = await leaving(id, key).catch(() => true);
  return (
    <div className="flex min-h-[calc(var(--svh)*100)] flex-col">
      <Nav home={false} />
      <main className="mx-auto grid w-full max-w-[var(--wrap)] flex-1 content-center px-6 py-20 md:px-14">
        <p className="label text-ash">The list</p>
        {there ? (
          <>
            <h1 className="mt-5 max-w-[14em] font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-[1.04]">Take your address off the list?</h1>
            <p className="mt-6 max-w-[30rem] text-ash">It is removed at once, with your place, and we will not write to you again.</p>
            <form method="post" action={`/api/list/leave/${id}/${key}`} className="mt-10">
              <input type="hidden" name="page" value="1" />
              <button type="submit" className="label plate-post">
                Take me off the list
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-5 max-w-[14em] font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-[1.04]">Nothing to remove.</h1>
            <p className="mt-6 max-w-[30rem] text-ash">This link no longer leads to an address on the list.</p>
            <p className="mt-10">
              <a href="/" className="label quiet-link -my-3 inline-block py-3 text-bone/85 underline decoration-ash/40 underline-offset-4">
                Back to the stone
              </a>
            </p>
          </>
        )}
      </main>
      <Footer page="other" />
    </div>
  );
}
