import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Plan rules (also enforced in the database). */
export const CREDITS_PER_CHANGE = 2;
export const CREDITS_PER_PUBLISH = 2;
export const FREE_DAILY_CREDITS = 10;
export const FREE_MONTHLY_CREDITS = 100;
export const FREE_DAILY_CHATS = 100;
export const PLANS = {
  pro: { name: "Pro", price: 25, credits: 1000, publishes: 5 },
  pro_plus: { name: "Pro Plus", price: 50, credits: 5000, publishes: 10 },
} as const;
export const PREMIUM_PRICE_USD = PLANS.pro.price;

export type Quota = {
  plan: "free" | "pro" | "pro_plus" | "admin";
  premium: boolean; admin: boolean;
  builds_today: number; builds_month: number; chats_today: number;
  daily_limit: number; monthly_limit: number; first_publish_free: boolean;
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

/** Credits left right now; -1 means unlimited. */
export function creditsLeft(q: Quota) {
  if (q.monthly_limit < 0) return -1;
  const month = q.monthly_limit - q.builds_month;
  const day = q.daily_limit < 0 ? month : q.daily_limit - q.builds_today;
  return Math.max(0, Math.min(day, month));
}
