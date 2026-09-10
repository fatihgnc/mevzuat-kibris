/**
 * Anchors for the articles in the "Hangi yasaya göre" card.
 *
 * Citations in running text are plain for now — neither linked nor
 * emphasised. The anchors stay on the card so linking to an article later
 * needs no further change here.
 */

/** A page-unique anchor built from the article ("Madde 43") and the law's name. */
export function articleAnchorId(law: string, article: string): string {
  const slug = (value: string) =>
    value
      .toLocaleLowerCase('tr')
      .replace(/[^a-z0-9çğıöşü]+/g, '-')
      .replace(/^-|-$/g, '');

  return `dayanak-${slug(article)}-${slug(law)}`;
}
