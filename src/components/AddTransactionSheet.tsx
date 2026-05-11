import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, TYPE_META, type TxType } from "@/lib/finance";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPES: TxType[] = ["expense", "income", "savings", "investment", "fixed_cost"];

export function AddTransactionSheet({ trigger }: { trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setType("expense");
    setCategory(CATEGORIES.expense[0]);
    setAmount("");
    setMemo("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("금액을 입력해주세요");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      category,
      amount: amt,
      memo: memo || null,
      occurred_on: date,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("기록되었습니다");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    reset();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full size-14 p-0 shadow-lg">
            <Plus className="size-6" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>새 기록</SheetTitle>
          <SheetDescription>오늘의 자산 흐름을 추가하세요</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="space-y-5 mt-6 px-4 pb-8">
          <div className="grid grid-cols-5 gap-2">
            {TYPES.map((t) => {
              const m = TYPE_META[t];
              const active = t === type;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setCategory(CATEGORIES[t][0]);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl py-3 text-xs border transition-all",
                    active
                      ? "bg-accent border-primary/40 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-lg">{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label>금액</Label>
            <Input
              inputMode="numeric"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES[type].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>날짜</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>메모 (선택)</Label>
            <Textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <Button type="submit" className="w-full h-12" disabled={busy}>
            {busy ? "저장중..." : "저장"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
