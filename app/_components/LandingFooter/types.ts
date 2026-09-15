// Structural only (anchor targets) — title/link label text now lives in
// messages/*.json's LandingFooter.columns, matched positionally by column
// index and, within a column, by link index.
export interface FooterLinkColumn {
  hrefs: string[];
}

export interface FooterColumnTranslation {
  title: string;
  links: { label: string }[];
}
