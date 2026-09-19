/**
 * Plain text of a law -> blocks to render.
 *
 * The text comes out of PDF and Word files, so it carries their layout: PDFs are
 * hard-wrapped at the page width, Word files put one paragraph on one line, table
 * cells leave runs of spaces. This turns that into paragraphs and headings without
 * changing a single word.
 */

export interface LawBlock {
  kind: 'heading' | 'paragraph';
  text: string;
}

/** A line that opens something new: an article, a numbered or lettered clause. */
const OPENS_NEW =
  /^(?:Madde\b|\(\d+\)|\([A-Za-zÇĞİÖŞÜçğıöşü]{1,3}\)|\d+\s*\.|[a-zçğıöşü]\)|[IVX]+\.\s)/;

/** A wrapped line is close to the page width; a heading or a paragraph's last line is not. */
const WRAPPED_MIN_LENGTH = 55;

const ENDS_SENTENCE = /[.;:!?]$/;

const collapse = (line: string) => line.replace(/[ \t ]+/g, ' ').trim();

/** ALL CAPS, a few letters at least, short enough to be a title rather than a shouted sentence. */
function isHeading(line: string): boolean {
  const letters = line.match(/\p{L}/gu)?.length ?? 0;
  return (
    letters >= 3 &&
    line.length <= 140 &&
    line === line.toLocaleUpperCase('tr') &&
    !ENDS_SENTENCE.test(line)
  );
}

export function lawTextBlocks(text: string): LawBlock[] {
  const blocks: LawBlock[] = [];
  let current: string | null = null;
  let previousLine = '';

  const flush = () => {
    if (current) blocks.push({ kind: 'paragraph', text: current });
    current = null;
  };

  for (const raw of text.split('\n')) {
    const line = collapse(raw);

    if (!line) {
      flush();
      previousLine = '';
      continue;
    }

    if (isHeading(line)) {
      flush();
      blocks.push({ kind: 'heading', text: line });
      previousLine = '';
      continue;
    }

    const continuesWrappedLine =
      current !== null &&
      !OPENS_NEW.test(line) &&
      previousLine.length >= WRAPPED_MIN_LENGTH &&
      !ENDS_SENTENCE.test(previousLine);

    if (continuesWrappedLine) {
      current = current + ' ' + line;
    } else {
      flush();
      current = line;
    }

    previousLine = line;
  }

  flush();
  return blocks;
}
