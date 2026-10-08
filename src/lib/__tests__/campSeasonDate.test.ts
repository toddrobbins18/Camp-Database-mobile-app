import { campDateInSeason, campDateStringInSeason, campTodayString } from '../campSeasonDate';

describe('campSeasonDate', () => {
  const now = new Date('2026-09-22T21:53:00-04:00');

  it('uses real calendar year for camp today', () => {
    expect(campTodayString(now)).toBe('2026-09-22');
  });

  it('does not shift dates when sidebar season is ahead', () => {
    expect(campDateStringInSeason('2027', now)).toBe('2026-09-22');
    expect(campDateInSeason('2027', now).getFullYear()).toBe(2026);
  });
});
