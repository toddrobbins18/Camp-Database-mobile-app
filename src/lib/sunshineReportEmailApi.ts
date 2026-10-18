import { supabase } from './supabase';

export type SendSunshineReportsResult =
  | {
      success: true;
      sent: number;
      results: Array<
        | { camper_id: string; status: 'sent'; recipient: string; subject: string }
        | { camper_id: string; status: 'skipped'; reason: string }
        | { camper_id: string; status: 'failed'; error: string }
      >;
    }
  | { success: false; error: string };

export async function sendSunshineReports(params: {
  companyId: string;
  reportDate: string;
  camperIds: string[];
}): Promise<SendSunshineReportsResult> {
  const { data, error } = await supabase.functions.invoke('send-sunshine-reports', {
    body: {
      company_id: params.companyId,
      report_date: params.reportDate,
      camper_ids: params.camperIds,
    },
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to send sunshine reports' };
  }

  if (!data?.success) {
    return { success: false, error: String(data?.error ?? 'Failed to send sunshine reports') };
  }

  return {
    success: true,
    sent: Number(data.sent ?? 0),
    results: Array.isArray(data.results) ? data.results : [],
  };
}
