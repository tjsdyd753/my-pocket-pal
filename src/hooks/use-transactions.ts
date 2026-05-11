import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Transaction = {
  id: string;
  user_id: string;
  type: "income" | "expense" | "savings" | "investment" | "fixed_cost";
  category: string;
  amount: number;
  memo: string | null;
  occurred_on: string;
  created_at: string;
};

export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}
