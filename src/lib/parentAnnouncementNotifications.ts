import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { showNewInboxMessageNotification } from './inboxLocalNotification';

/** Local alert when camp publishes a new parent portal announcement (family login). */
export function useParentAnnouncementNotifications(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      const { data: fam } = await supabase
        .from('families')
        .select('company_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (cancelled || !fam?.company_id) return;

      const companyId = fam.company_id as string;

      channel = supabase
        .channel(`parent-announcements-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'parent_portal_announcements',
            filter: `company_id=eq.${companyId}`,
          },
          (payload) => {
            const row = payload.new as {
              title?: string;
              body?: string;
              is_published?: boolean;
            };
            if (!row?.is_published) return;
            void showNewInboxMessageNotification(
              row.title?.trim() || 'Camp announcement',
              String(row.body ?? '').slice(0, 200),
              { activeView: 'parent_portal' },
            );
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);
}
