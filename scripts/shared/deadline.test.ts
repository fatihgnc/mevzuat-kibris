import { describe, expect, it } from 'vitest';
import { extractDeadline } from './deadline';

describe('extractDeadline — application windows', () => {
  it('takes the end of a "A - B" window written in bold', () => {
    const body =
      'başvurular, **29 Eylül 2026 - 3 Ocak 2027** (her iki tarih dahil) tarihleri arasında kabul edilecektir.';
    expect(extractDeadline(body).deadlineAt).toBe('2027-01-03');
  });

  it('accepts en dashes and a missing space', () => {
    expect(extractDeadline('başvurular, 30 Aralık 2022–5 Eylül 2023 (her iki tarih dahil)').deadlineAt).toBe(
      '2023-09-05',
    );
  });

  it('reads the compact "11-25 Haziran 2025" form', () => {
    const body = 'BAŞVURULAR 1. Münhal mevkiler için; 11-25 Haziran 2025 (Her iki tarih dâhil) tarihleri arasında';
    expect(extractDeadline(body).deadlineAt).toBe('2025-06-25');
  });

  it('does not read "2026 - 5 Ocak" as a compact range', () => {
    const body = 'başvurular, 28 Ağustos 2026 - 5 Ocak 2027 (her iki tarih dahil)';
    expect(extractDeadline(body).deadlineAt).toBe('2027-01-05');
  });

  it('uses "tarihine kadar" only right after an application cue', () => {
    const cued = 'yazılı başvurularını 11 Haziran 2025 tarihine kadar ulaştırmalıdır.';
    expect(extractDeadline(cued).deadlineAt).toBe('2025-06-11');

    const eligibility = '46 yaşından gün almamış olmak kuralı 31 Aralık 2027 tarihine kadar uygulanır.';
    expect(extractDeadline(eligibility).deadlineAt).toBeNull();
  });

  it('ignores a range whose end precedes its start (OCR digit error)', () => {
    expect(extractDeadline('başvurular, 20 Eylül 2026 - 5 Eylül 2026 arasında').deadlineAt).toBeNull();
  });

  it('prefers ranges next to an application cue over unrelated ones', () => {
    const body =
      'başvurular, 15 Eylül 2026 - 11 Mart 2027 (her iki tarih dahil) tarihleri arasında kabul edilir. ' +
      'x'.repeat(300) +
      ' 1 Ocak 2010 - 30 Haziran 2026 dönemine ait prim borçları';
    expect(extractDeadline(body).deadlineAt).toBe('2027-03-11');
  });

  it('stays empty when two cued windows disagree', () => {
    const body = 'başvurular 1 Mart 2026 - 10 Mart 2026 arasında; müracaatlar 1 Nisan 2026 - 10 Nisan 2026 arasında.';
    expect(extractDeadline(body).deadlineAt).toBeNull();
  });
});
