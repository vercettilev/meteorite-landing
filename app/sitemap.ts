import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* The pages meant to be found. Add a page here when it is meant to be found too. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return [];
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/legal`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
