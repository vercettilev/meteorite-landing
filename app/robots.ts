import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/*
  Everything may be crawled. A page that should stay out of search says so itself with a noindex
  tag, which a crawler can only read if it is let in.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(SITE_URL && { sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL }),
  };
}
