import { describe, expect, it } from 'vitest';

import { lawTextBlocks } from './law-text';

describe('lawTextBlocks', () => {
  it('joins the lines of a hard-wrapped PDF paragraph', () => {
    const text = [
      'Bu Yasa, Kuzey Kıbrıs Türk Cumhuriyeti sınırları içinde kurulan tüm derneklere',
      've bunların üst kuruluşlarına uygulanır.',
    ].join('\n');

    expect(lawTextBlocks(text)).toEqual([
      {
        kind: 'paragraph',
        text: 'Bu Yasa, Kuzey Kıbrıs Türk Cumhuriyeti sınırları içinde kurulan tüm derneklere ve bunların üst kuruluşlarına uygulanır.',
      },
    ]);
  });

  it('starts a new paragraph at an article or a numbered clause', () => {
    const text = [
      'Madde 1. Bu Yasa, Dernekler Yasası olarak isimlendirilir ve yürürlüğe girdiği tarihten',
      'itibaren uygulanır.',
      '(2) Bu fıkra ikinci fıkradır ve ayrı bir paragraf olarak gösterilmelidir, çünkü açılışı belli',
      'olan bir bentle başlar.',
    ].join('\n');

    const blocks = lawTextBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.text.startsWith('Madde 1.')).toBe(true);
    expect(blocks[1]!.text.startsWith('(2)')).toBe(true);
  });

  it('keeps a short line apart from what follows it', () => {
    const blocks = lawTextBlocks('Kısa İsim\nBu Yasa, Dernekler Yasası olarak isimlendirilir.');
    expect(blocks.map((b) => b.text)).toEqual([
      'Kısa İsim',
      'Bu Yasa, Dernekler Yasası olarak isimlendirilir.',
    ]);
  });

  it('turns an ALL CAPS line into a heading', () => {
    expect(lawTextBlocks('BİRİNCİ KISIM\nGenel Kurallar')).toEqual([
      { kind: 'heading', text: 'BİRİNCİ KISIM' },
      { kind: 'paragraph', text: 'Genel Kurallar' },
    ]);
  });

  it('does not treat a shouted sentence as a heading', () => {
    expect(lawTextBlocks('BU BİR CÜMLEDİR.')[0]!.kind).toBe('paragraph');
  });

  it('separates paragraphs at blank lines and collapses runs of spaces', () => {
    expect(lawTextBlocks('Madde   1.    Kısa   isim\n\n\nMadde 2.  Yorum')).toEqual([
      { kind: 'paragraph', text: 'Madde 1. Kısa isim' },
      { kind: 'paragraph', text: 'Madde 2. Yorum' },
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(lawTextBlocks('')).toEqual([]);
    expect(lawTextBlocks('  \n\n ')).toEqual([]);
  });
});
