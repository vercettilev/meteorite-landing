"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { glide } from "@/lib/glide";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: `#${string}`; field?: string };

/* A link to a place on this page that travels there (lib/glide.ts). A click with a key held, or the middle button, is left to the browser. */
export function GlideLink({ href, field, onClick, ...rest }: Props) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    glide(target, href, field);
  };
  return <a href={href} onClick={go} {...rest} />;
}
