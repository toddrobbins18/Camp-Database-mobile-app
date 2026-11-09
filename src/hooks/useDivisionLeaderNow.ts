import { useEffect, useMemo, useState } from "react";
import { useCompany } from "../contexts/CompanyContext";
import { useCampOperationalDate } from "./useCampOperationalDate";
import { useRole } from "./useRole";
import { supabase } from "../lib/supabase";
import { loadUserBusCounselorProfile } from "../lib/transportBusCounselor";
import type { GroupScheduleSlot } from "../lib/groupSchedule";
import {
  campMinutesNow,
  divisionLeaderBannerState,
  loadDivisionLeaderDivisionIds,
  loadDivisionLeaderGroupNames,
  loadDivisionLeaderRotationWeek,
  loadDivisionLeaderScheduleSlots,
  type DivisionLeaderBannerState,
} from "../lib/divisionLeaderNow";

const HIDDEN: DivisionLeaderBannerState = {
  visible: false,
  lines: [],
  message: null,
  nowMinutes: 0,
  phase: "idle",
};

export function useDivisionLeaderNow(): DivisionLeaderBannerState {
  const { companyId, season, isDayCamp } = useCompany();
  const { userId, data: roleData } = useRole();
  const { operationalDateString } = useCampOperationalDate();
  const isDl = !!roleData?.isDivisionLeader;
  const enabled = Boolean(isDayCamp && isDl && companyId && season && userId);

  const [now, setNow] = useState(() => new Date());
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [slots, setSlots] = useState<GroupScheduleSlot[]>([]);
  const [rotationWeek, setRotationWeek] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !companyId || !userId || !season) {
      setGroupNames([]);
      setSlots([]);
      setRotationWeek(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [divisionIds, counselor, loaded] = await Promise.all([
        loadDivisionLeaderDivisionIds(supabase, userId, companyId),
        loadUserBusCounselorProfile(supabase, userId),
        loadDivisionLeaderScheduleSlots(supabase, companyId, season),
      ]);
      const names = await loadDivisionLeaderGroupNames(
        supabase,
        companyId,
        season,
        divisionIds,
        counselor.assignedGroups,
      );
      if (cancelled) return;
      setGroupNames(names);
      setSlots(loaded);
      const week = await loadDivisionLeaderRotationWeek(
        supabase,
        companyId,
        season,
        operationalDateString,
        loaded,
      );
      if (!cancelled) setRotationWeek(week);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, companyId, userId, season, operationalDateString]);

  return useMemo(() => {
    if (!enabled) return HIDDEN;
    return divisionLeaderBannerState({
      isDayCamp,
      isDl,
      groupNames,
      slots,
      ymd: operationalDateString,
      minutes: campMinutesNow(now),
      rotationWeek,
    });
  }, [enabled, isDayCamp, isDl, groupNames, slots, operationalDateString, now, rotationWeek]);
}
