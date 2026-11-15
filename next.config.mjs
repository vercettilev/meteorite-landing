/*
  Security headers. Every page gets the common ones. The pages (the landing, the legal page, the
  404) stay static and carry the Content-Security-Policy below, which has to allow inline scripts:
  Next.js writes its own into every static page, and app/page.tsx sets up the cut with one. Never
  add a hash or a nonce to SITE_CSP: browsers then ignore 'unsafe-inline' and Next.js's own scripts
  stop. Vercel already sends Strict-Transport-Security.
*/
const dev = process.env.NODE_ENV === "development";
const originOf = (url) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};

const SITE_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  /* The waitlist's endpoint, and in development the local server that saves the stone's still (scripts/save-still.mjs). */
  ["connect-src 'self'", originOf(process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT), dev && "http://127.0.0.1:8791"].filter(Boolean).join(" "),
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const COMMON = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* The stone's light follows a phone's tilt, so the motion sensors stay allowed for the site itself. */
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(self), gyroscope=(self), magnetometer=(self), camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), midi=(), display-capture=(), browsing-topics=()",
  },
];

/* The privacy notice names a contact for anyone who wants their address removed: the list must not open without one. */
if (process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT && !process.env.NEXT_PUBLIC_CONTACT_EMAIL) {
  console.warn("\n⚠ NEXT_PUBLIC_WAITLIST_ENDPOINT is set but NEXT_PUBLIC_CONTACT_EMAIL is not: the privacy notice promises an address to write to.\n");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: { qualities: [90] },
  async headers() {
    return [
      { source: "/:path*", headers: COMMON },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: SITE_CSP },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
