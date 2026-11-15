/*
  The site's own address, so that shared links, the sitemap and robots.txt carry absolute addresses:
  the domain once there is one (NEXT_PUBLIC_SITE_URL, see .env.example), and until then the
  production address Vercel gives the project. Undefined when neither is known (a local build).
*/
export const SITE_URL: string | undefined =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

/* Where people can write to us: shown on the legal page, in the footer from 1024px, and in the privacy notice. */
export const CONTACT_EMAIL: string | undefined = process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined;

/*
  The photograph the stone is drawn from (scripts/stone-textures.mjs). Its licence, CC BY-SA 4.0,
  asks for this credit wherever the stone is shown: it is on the legal page.
*/
export const STONE_PHOTO = {
  url: "https://commons.wikimedia.org/wiki/File:Lunar_meteorite_NWA_10665,_Feldspathic_breccia-8937.jpg",
  author: "Raimond Spekking",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};
