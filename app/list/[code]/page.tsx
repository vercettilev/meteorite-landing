import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/Landing";
import { ordinal } from "@/lib/format";
import { isCode, standing, type Standing } from "@/lib/list";
import { cardPath } from "@/lib/share";

/*
  What a link from the list opens: the landing page itself, so whoever follows the link meets the
  stone and the field as anyone does, and joining from here counts for whoever the link belongs to
  (components/JoinForm.tsx reads the code from the address). What is its own is the card the link
  carries when it is shared, with that person's place on it (card/card.tsx).

  Each link's page is made the first time it is asked for and kept for a few minutes, so a link
  passed around is not drawn afresh for every visitor. The card's address ends in the place it
  shows (lib/share.ts), so that when the place changes, whoever keeps cards (X does, for days) is
  given a new one. The link itself is shared with an ending too ("?n=42"), which this page does
  not read: it only makes the link new to whoever kept its last card. These pages stay out of
  search: they are the home page again, under a code.
*/
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ code: string }> };

/* The place a link holds, or null when it is not on the list. If the list cannot be read just now, the link still opens the page, under the site's own card. */
async function find(code: string): Promise<Standing | null | "unknown"> {
  if (!isCode(code)) return null;
  try {
    return await standing(code);
  } catch (error) {
    console.error("list", error);
    return "unknown";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const found = await find(code);
  if (!found || found === "unknown") return { robots: { index: false } };

  const place = ordinal(found.place);
  const title = `The ${place} to know`;
  const card = {
    url: cardPath(found),
    width: 1200,
    height: 630,
    alt: `${found.brought > 0 ? "A sphere of lunar meteorite, cut and polished, on a brass stand" : "A sphere of lunar meteorite on a brass stand"}, and the words: ${title}.`,
  };
  return {
    title,
    robots: { index: false },
    openGraph: { title: `${title} · Meteorite`, description: "Own a piece of space.", siteName: "Meteorite", type: "website", images: [card] },
    twitter: { card: "summary_large_image", title: `${title} · Meteorite`, description: "Own a piece of space.", images: [card] },
  };
}

export default async function ListLink({ params }: Props) {
  const { code } = await params;
  if (!(await find(code))) notFound();
  return <Landing />;
}
