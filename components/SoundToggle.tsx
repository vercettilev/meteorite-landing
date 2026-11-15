"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sound";

/* Off until asked. Lit, and underlined, while it is on. */
export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => sound.subscribe(setOn), []);

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => sound.toggle()}
      className={`label quiet-link -my-3 hidden py-3 min-[375px]:inline-block ${on ? "text-bone underline decoration-1 underline-offset-[0.3em]" : "text-ash"}`}
    >
      Sound
    </button>
  );
}
