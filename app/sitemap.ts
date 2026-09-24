import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Real "now", not a fabricated per-page date — these are static marketing
  // routes with no per-page CMS timestamp to report honestly; `lastModified`
  // at generation time is still a valid freshness signal search engines use
  // (better than omitting the field entirely).
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    // /login and /signup are deliberately absent: they're marked `noindex`
    // (see their own page metadata) since a login form has no organic-search
    // value — listing a noindex URL in the sitemap is itself flagged by
    // Google Search Console as invalid.
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
