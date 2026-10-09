import { describe, expect, it } from 'vitest';

import { formatIssueNumbers } from './issue-numbers';

describe('formatIssueNumbers', () => {
  it('names a single issue', () => {
    expect(formatIssueNumbers([200])).toBe('Sayı 200');
  });

  it('lists two consecutive issues instead of a range', () => {
    expect(formatIssueNumbers([146, 145])).toBe('Sayı 145 ve 146');
  });

  it('collapses three or more consecutive issues into a range', () => {
    expect(formatIssueNumbers([126, 124, 125])).toBe('Sayı 124–126');
  });

  it('lists non-consecutive issues', () => {
    expect(formatIssueNumbers([150, 145, 146])).toBe('Sayı 145, 146 ve 150');
  });

  it('returns nothing for no issues', () => {
    expect(formatIssueNumbers([])).toBe('');
  });
});
