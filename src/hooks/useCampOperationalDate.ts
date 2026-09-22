import { useEffect, useMemo, useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { campDateInSeason, campDateStringInSeason } from '../lib/campSeasonDate';
import { DEFAULT_SEASON } from '../constants/seasonConstants';

/** Live clock + camp "today" aligned to the sidebar season year. */
export function useCampOperationalDate() {
  const { season } = useCompany();
  const currentSeason = season || DEFAULT_SEASON;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const operationalDate = useMemo(
    () => campDateInSeason(currentSeason, now),
    [currentSeason, now],
  );

  const operationalDateString = useMemo(
    () => campDateStringInSeason(currentSeason, now),
    [currentSeason, now],
  );

  return {
    now,
    operationalDate,
    operationalDateString,
    currentSeason,
  };
}
