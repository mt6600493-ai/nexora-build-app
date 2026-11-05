import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Free plan rules (also enforced in the database). */
export const FREE_DAILY_CREDITS = 10;
export const FREE_MONTHLY_CREDITS = 100;
export const FREE_DAILY_CHATS = 100;
export const PREMIUM_PRICE_USD = 25;
export const PREMIUM_MONTHLY_PUBLISHES = 10;

export type Quota = {
  premium: boolean; admin: boolean;
  builds_today: number; builds_month: number; chats_today: number;
  publish: { used: number; allowed: number };
};

export const quotaQuery = queryOptions({
  queryKey: ["quota"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("my_quota");
    if (error) throw error;
    return data as unknown as Quota | null;
  },
  staleTime: 15_000,
});

export function useQuota() { return useQuery(quotaQuery); }

/** Credits left today for a free user: the smaller of today's and this month's remaining. */
export function creditsLeft(q: Quota) {
  return Math.max(0, Math.min(FREE_DAILY_CREDITS - q.builds_today, FREE_MONTHLY_CREDITS - q.builds_month));
}
