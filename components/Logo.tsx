import Image from "next/image";

/* The wordmark. The one at the top of a page is fetched at once (eager); the others wait until they are near (lazy). */
export function Logo({ width = 172, className, eager = false }: { width?: number; className?: string; eager?: boolean }) {
  return (
    <Image
      src="/assets/meteorite-logo-horizontal-bone.svg"
      alt="Meteorite"
      width={width}
      height={Math.round((width * 898) / 3918.68)}
      loading={eager ? "eager" : "lazy"}
      unoptimized
      className={className}
    />
  );
}

/* The mark alone, drawn for small sizes (design/brand/meteorite-mark-small.svg), in the colour of the text around it. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <clipPath id="mark-small-clip">
          <circle cx="500" cy="500" r="440" />
        </clipPath>
      </defs>
      <g clipPath="url(#mark-small-clip)" fill="none" stroke="currentColor">
        <line x1="799.63" y1="169.82" x2="363.87" y2="924.57" strokeWidth="78" />
        <line x1="54.19" y1="513" x2="601.49" y2="513" strokeWidth="70" />
        <line x1="262.9" y1="122.25" x2="488.51" y2="513" strokeWidth="64" />
        <line x1="902.86" y1="690" x2="499.3" y2="690" strokeWidth="58" />
      </g>
      <circle cx="500" cy="500" r="440" fill="none" stroke="currentColor" strokeWidth="56" />
    </svg>
  );
}
