import { supabase } from "./supabase";

interface NotifyStaffParams {
  staffNames: string[];
  eventTitle: string;
  eventDate: string;
  eventType: "activity" | "special_event" | "trip";
  companyId?: string | null;
}

// Fire-and-forget notification to match web behavior.
export async function notifyStaffAssignment({
  staffNames,
  eventTitle,
  eventDate,
  eventType,
  companyId,
}: NotifyStaffParams): Promise<void> {
  if (!staffNames.length || !companyId) return;

  try {
    const response = await supabase.functions.invoke("notify-staff-assignment", {
      body: { staffNames, eventTitle, eventDate, eventType, companyId },
    });

    if (response.error) {
      console.error("Staff notification error:", response.error);
    }
  } catch (error) {
    console.error("Failed to send staff assignment notification:", error);
  }
}
