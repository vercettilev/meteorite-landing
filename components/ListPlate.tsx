"use client";

import { useEffect, useRef, useState } from "react";
import { count, ordinal } from "@/lib/format";
import { seen, useMine, type Mine } from "@/lib/mine";
import { share } from "@/lib/share";

/*
  The visitor's card, put before them: the page goes dark and the card stands alone, as a plate
  does on a museum's wall, with the one thing to do with it. The line under the field
  (JoinForm.tsx) says the same more quietly, and too quietly to be acted on, so the card is shown
  at the three moments when there is a reason to pass it on: as someone joins, when someone has
  joined by their link since they last looked (the card has changed: the stone is cut, the place
  is new), and when they ask for it. lib/mine.ts says which of these it is.

  It is a dialog: the keyboard stays within it, Esc and a click on the dark close it, and the
  page behind does not scroll. The card is the one the link carries (app/list/[code]/card), so
  asking for it here is also what has it drawn before X comes for it.
*/
export function ListPlate() {
  const mine = useMine();
  const plate = useRef<HTMLDialogElement>(null);
  const open = Boolean(mine && (mine.fresh || mine.moved || mine.shown));

  useEffect(() => {
    const dialog = plate.current;
    if (!dialog || !open) return;
    dialog.showModal();
    /* The dialog would put the keyboard on its first button, which closes it. It belongs on the way to X. */
    dialog.querySelector<HTMLElement>(".plate-post")?.focus({ preventScroll: true });
    document.documentElement.dataset.plate = "";
    return () => {
      delete document.documentElement.dataset.plate;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog ref={plate} className="plate" aria-labelledby="plate-said" onClose={seen} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
      {mine && open && <Plate mine={mine} />}
    </dialog>
  );
}

function Plate({ mine }: { mine: Mine }) {
  const [copied, setCopied] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const card = useRef<HTMLImageElement>(null);
  const { link, post, card: picture, file } = share(mine, window.location.origin);
  const place = ordinal(mine.place);

  /* The card may already be in the browser's keeping, and then it never says that it has loaded. */
  useEffect(() => {
    if (card.current?.complete && card.current.naturalWidth > 0) setDrawn(true);
  }, [picture]);

  /* Why the card is here. */
  const news = mine.moved ? `${mine.brought === 1 ? "One person has" : `${count(mine.brought)} people have`} joined by your link.` : mine.fresh ? "You are on the list." : "Your card.";
  /* What to do with it. The list is in order of how many each has brought (lib/list.ts), so whoever is first can only be passed. */
  const said = mine.place === 1 ? "Every friend who joins by your link keeps you first." : "Every friend who joins by your link moves you up the list.";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      /* The browser will not let the page copy: the link is in the email, and X is given it with the post. */
    }
  }

  return (
    <div className="plate-sheet">
      <div className="flex items-baseline justify-between gap-6">
        <p className="label text-ash">{news}</p>
        <form method="dialog">
          <button className="label quiet-link -m-3 p-3 text-bone/85">Close</button>
        </form>
      </div>
      <div className="plate-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={card} src={picture} alt={`Your card. It reads: the ${place} to know.`} width={1200} height={630} decoding="async" onLoad={() => setDrawn(true)} data-drawn={drawn ? "" : undefined} />
      </div>
      <p id="plate-said" className="max-w-[30rem] font-serif text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.18]">
        {said}
      </p>
      <p className="label flex flex-wrap items-center gap-x-7 gap-y-3 text-bone/85">
        <a href={post} target="_blank" rel="noopener" className="plate-post">
          Post on X
        </a>
        <button type="button" onClick={copy} className="quiet-link -my-2 py-2">
          <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
        </button>
        <a href={picture} download={file} className="quiet-link -my-2 py-2">
          Save card
        </a>
      </p>
    </div>
  );
}
