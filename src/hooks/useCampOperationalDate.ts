import { useEffect, useMemo, useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { campTodayDate, campTodayString } from '../lib/campSeasonDate';
import { DEFAULT_SEASON } from '../constants/seasonConstants';

/** Live clock + real camp-timezone “today” (season filters roster, not calendar year). */
export function useCampOperationalDate() {
  const { season } = useCompany();
  const currentSeason = season || DEFAULT_SEASON;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const operationalDate = useMemo(() => campTodayDate(now), [now]);

  const operationalDateString = useMemo(() => campTodayString(now), [now]);

  return {
    now,
    operationalDate,
    operationalDateString,
    currentSeason,
  };
}
