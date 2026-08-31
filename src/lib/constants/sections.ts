/**
 * Resmî Gazete bölüm taksonomisi — spec 3.2.
 * Sayı sayfasında kayıtlar bu sırayla gruplanır; sıra gazetenin kendi sırasıdır.
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

/** Künyede görünen kısa ad: "Sayı 262, Ek III" */
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

/** Sayı sayfasındaki grup başlığı — ne içerdiğini söyler. */
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

/** Arşiv HTML'indeki ham bölüm başlığı → enum. */
export const SECTION_HEADINGS: Array<[RegExp, Section]> = [
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
