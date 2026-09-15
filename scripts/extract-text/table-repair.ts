import * as cheerio from 'cheerio';

/**
 * Repairs the specific HTML malformation DeepSeek-OCR produces in dense
 * tables, and nothing else.
 *
 * MEASURED (13.pdf, page 14, 19-row table): the model drops the opening <td>
 * for a row's first cell on some rows ("<tr>7<td>NAME</td>...") and sometimes
 * doubles the opening tag ("<tr><tr>"). Left to cheerio's own error recovery,
 * the stray leading text is silently DROPPED rather than kept as a cell --
 * verified against the same table: cheerio alone lost the row number on 4 of
 * 19 rows (7, 12, 16, 17), shifting every column one to the left. That is
 * worse than the input.
 *
 * These two regex fixes re-add exactly the tag DeepSeek-OCR omitted; they do
 * not infer or invent any cell content.
 */
function applyKnownFixes(html: string): string {
  let out = html;
  // Stray text before a row's first <td> -- wrap it as a proper cell.
  out = out.replace(/<tr>(?!<\/?td|<\/?tr)([^<]+)<td>/g, '<tr><td>$1</td><td>');
  // Doubled opening tag.
  out = out.replace(/<tr>\s*<tr>/g, '<tr>');
  return out;
}

function extractRows(html: string): string[][] {
  const $ = cheerio.load(html, { xmlMode: false });
  const rows: string[][] = [];
  $('tr').each((_, tr) => {
    const cells: string[] = [];
    $(tr)
      .find('td')
      .each((__, td) => {
        cells.push($(td).text().trim());
      });
    if (cells.some((c) => c.length > 0)) rows.push(cells);
  });
  return rows;
}

/**
 * Repairs one `<table>...</table>` block. A row is only trusted after the fix
 * if its cell count matches the header's -- otherwise it is left exactly as
 * extracted (never dropped, never guessed) and the table is flagged so a
 * human can look at it.
 *
 * WHY THIS IS DELIBERATELY CONSERVATIVE. An earlier version of this function
 * also tried to clean up repeated near-duplicate cell values (e.g. a
 * department name OCR'd six different ways down a column) by collapsing them
 * to the most frequent variant. Tested against the same 19-row table, it
 * corrupted the GİRİŞ TARİHİ (entry date) column -- a column that must NOT
 * repeat -- by overwriting five people's real, distinct dates with
 * "01.01.2014" just because that value happened to be the mode. A column
 * being visually repetitive is not evidence that it SHOULD repeat; there is
 * no safe way to tell "boilerplate" from "coincidentally similar unique
 * data" without understanding what the column means. That normalization step
 * was removed entirely rather than fixed -- the risk of silently rewriting
 * correct data outweighs the cosmetic win of a tidier table.
 */
export function repairTable(rawTableHtml: string): { html: string; needsReview: boolean } {
  const repaired = applyKnownFixes(rawTableHtml);
  const rows = extractRows(repaired);
  if (rows.length === 0) return { html: rawTableHtml, needsReview: true };

  const header = rows[0] as string[];
  const headerLen = header.length;
  const needsReview = rows.some((row) => row.length !== headerLen);

  const toMarkdownRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const separator = `| ${header.map(() => '---').join(' | ')} |`;
  const md = [toMarkdownRow(header), separator, ...rows.slice(1).map(toMarkdownRow)].join('\n');

  return { html: md, needsReview };
}

/** Finds every `<table>...</table>` block in a markdown document and repairs each in place. */
export function repairAllTables(markdown: string): { text: string; anyNeedsReview: boolean } {
  let anyNeedsReview = false;
  const text = markdown.replace(/<table>[\s\S]*?<\/table>/g, (match) => {
    const { html, needsReview } = repairTable(match);
    if (needsReview) anyNeedsReview = true;
    return html;
  });
  return { text, anyNeedsReview };
}
