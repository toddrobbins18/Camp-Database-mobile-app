import {
  enrollmentWeekSpanDays,
  formatEnrollmentWeekRange,
  printEnrollmentWeekRow,
} from '../enrollmentWeekCalendar';

describe('enrollmentWeekCalendar print clamp', () => {
  it('clamps a season-long week to Mon–Fri of the report date', () => {
    const row = { weekNumber: 1, startDate: '2027-01-28', endDate: '2027-07-03' };
    expect(enrollmentWeekSpanDays(row)).toBeGreaterThan(6);
    expect(printEnrollmentWeekRow(row, '2027-07-01')).toEqual({
      weekNumber: 1,
      startDate: '2027-06-28',
      endDate: '2027-07-02',
    });
    const label = formatEnrollmentWeekRange(row, '2027-07-01');
    expect(label).toContain('Jun 28');
    expect(label).toContain('Jul 2, 2027');
  });

  it('clamps a season-long week to the last Mon–Fri when no report date is given', () => {
    const row = { weekNumber: 1, startDate: '2027-01-28', endDate: '2027-07-03' };
    expect(printEnrollmentWeekRow(row)).toEqual({
      weekNumber: 1,
      startDate: '2027-06-28',
      endDate: '2027-07-02',
    });
  });
});
