/**
 * "Sayı 200", "Sayı 124–126", "Sayı 145, 146 ve 150" — the numbers of a day's
 * issues as one label, for titles and headings. A run of consecutive numbers
 * collapses to a range only from three on; two consecutive numbers read better
 * listed than as "145–146".
 */
export function formatIssueNumbers(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return 'Sayı ' + sorted[0];

  const isRun = sorted.every((n, i) => i === 0 || n === sorted[i - 1]! + 1);
  if (isRun && sorted.length >= 3) return 'Sayı ' + sorted[0] + '–' + sorted[sorted.length - 1];

  return 'Sayı ' + sorted.slice(0, -1).join(', ') + ' ve ' + sorted[sorted.length - 1];
}
