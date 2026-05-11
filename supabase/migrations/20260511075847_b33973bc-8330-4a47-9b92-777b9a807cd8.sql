
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense', 'savings', 'investment', 'fixed_cost');

CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  memo TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, occurred_on DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);
