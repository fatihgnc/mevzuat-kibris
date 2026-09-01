/**
 * The gazette's section taxonomy — spec 3.2.
 * Records are grouped in this order on the issue page; the order is the gazette's
 * own.
 */
export const SECTIONS = [
  'MAIN',
  'EK_I_B_I',
  'EK_I_B_II',
  'EK_II_B_I',
  'EK_III',
  'EK_IV_B_I',
  'EK_IV_B_II',
  'EK_V_B_I',
  'EK_V_B_II',
  'EK_VI',
] as const;

export type Section = (typeof SECTIONS)[number];

/** The short name shown in the meta bar: "Sayı 262, Ek III" */
export const SECTION_SHORT: Record<Section, string> = {
  MAIN: 'Ana bölüm',
  EK_I_B_I: 'Ek I Bölüm I',
  EK_I_B_II: 'Ek I Bölüm II',
  EK_II_B_I: 'Ek II Bölüm I',
  EK_III: 'Ek III',
  EK_IV_B_I: 'Ek IV Bölüm I',
  EK_IV_B_II: 'Ek IV Bölüm II',
  EK_V_B_I: 'Ek V Bölüm I',
  EK_V_B_II: 'Ek V Bölüm II',
  EK_VI: 'Ek VI',
};

/** The group heading on the issue page — it says what the section contains. */
export const SECTION_DESCRIPTION: Record<Section, string> = {
  MAIN: 'Kararnameler, münhal ilanları ve duyurular',
  EK_I_B_I: 'Yasalar',
  EK_I_B_II: 'Yasa gücünde kararnameler',
  EK_II_B_I: 'Anayasa Mahkemesi kararları',
  EK_III: 'Tüzükler, emirnameler ve kurul kararları',
  EK_IV_B_I: 'Bakanlar Kurulu kararları',
  EK_IV_B_II: 'Meclis kararları',
  EK_V_B_I: 'Şirket sicil işlemleri',
  EK_V_B_II: 'Ticaret markaları',
  EK_VI: 'Yasa tasarıları ve önerileri',
};

/**
 * Raw section heading in the archive HTML -> enum.
 *
 * The `\s*` is deliberately loose: the source contains spellings such as "EK IV
 * BÖLÜMI" (no space), "EK  VI" and "EK IV BÖLÜM    I". These are data-entry dirt,
 * not separate sections.
 *
 * MAIN has to be here: in the inner table the section cell is filled only at the
 * start of a block and carries downward (see parseIndexTable). When the source
 * returns to the main section it writes a plain "MAIN" into the cell; if we did not
 * recognise it, the previous EK heading would stick and records would land in the
 * wrong section. "MAİN" (with a Turkish İ) really does occur in the source, and it
 * is written out explicitly because the /i flag does not equate İ with I.
 *
 * An unrecognised cell (a bare "EK V", or a keyboard accident like
 * "hljkhljhljkhljkhlj") deliberately does not match: the carried-down section is
 * preserved. Guessing is no better than writing the wrong section.
 */
export const SECTION_HEADINGS: Array<[RegExp, Section]> = [
  [/^MA[İI]N$/i, 'MAIN'],
  [/^EK\s*I\s*BÖLÜM\s*I$/i, 'EK_I_B_I'],
  [/^EK\s*I\s*BÖLÜM\s*II$/i, 'EK_I_B_II'],
  [/^EK\s*II\s*BÖLÜM\s*I$/i, 'EK_II_B_I'],
  [/^EK\s*III$/i, 'EK_III'],
  [/^EK\s*IV\s*BÖLÜM\s*I$/i, 'EK_IV_B_I'],
  [/^EK\s*IV\s*BÖLÜM\s*II$/i, 'EK_IV_B_II'],
  [/^EK\s*V\s*BÖLÜM\s*I$/i, 'EK_V_B_I'],
  [/^EK\s*V\s*BÖLÜM\s*II$/i, 'EK_V_B_II'],
  [/^EK\s*VI$/i, 'EK_VI'],
];

export function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value);
}

export function sectionShort(value: string): string {
  return isSection(value) ? SECTION_SHORT[value] : value;
}
