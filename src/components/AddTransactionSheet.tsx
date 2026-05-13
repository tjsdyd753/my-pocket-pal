import { useEffect, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, TYPE_META, type TxType } from "@/lib/finance";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/hooks/use-transactions";

const TYPES: TxType[] = ["expense", "income", "savings", "investment", "fixed_cost"];

// 사용자 로컬 타임존 기준 오늘 날짜(YYYY-MM-DD)
const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type Props = {
  trigger?: React.ReactNode;
  transaction?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
};

export function AddTransactionSheet({ trigger, transaction, open: openProp, onOpenChange, defaultDate }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setOpenInternal(v);
  };
  const isEdit = !!transaction;

  const [type, setType] = useState<TxType>(transaction?.type ?? "expense");
  const [category, setCategory] = useState(transaction?.category ?? CATEGORIES.expense[0]);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [memo, setMemo] = useState(transaction?.memo ?? "");
  const [date, setDate] = useState(transaction?.occurred_on ?? defaultDate ?? todayLocal());
  const [busy, setBusy] = useState(false);

  // re-sync when opening
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setCategory(transaction.category);
      setAmount(String(transaction.amount));
      setMemo(transaction.memo ?? "");
      setDate(transaction.occurred_on);
    } else {
      setDate(defaultDate ?? todayLocal());
    }
  }, [open, transaction, defaultDate]);

  const reset = () => {
    setType("expense");
    setCategory(CATEGORIES.expense[0]);
    setAmount("");
    setMemo("");
    setDate(todayLocal());
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
    const payload = {
      type,
      category,
      amount: amt,
      memo: memo || null,
      occurred_on: date,
    };
    const { error } = isEdit
      ? await supabase.from("transactions").update(payload).eq("id", transaction!.id)
      : await supabase.from("transactions").insert({ ...payload, user_id: user.id });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    await qc.invalidateQueries({ queryKey: ["transactions"], refetchType: "active" });
    setBusy(false);
    toast.success(isEdit ? "수정되었습니다" : "기록되었습니다");
    if (!isEdit) reset();
    setOpen(false);
  };

  const remove = async () => {
    if (!transaction) return;
    setBusy(true);
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    await qc.invalidateQueries({ queryKey: ["transactions"], refetchType: "active" });
    setBusy(false);
    toast.success("삭제되었습니다");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <SheetTrigger asChild>
          {trigger ?? (
            <Button size="lg" className="rounded-full size-14 p-0 shadow-lg">
              <Plus className="size-6" />
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{isEdit ? "기록 수정" : "새 기록"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "내용을 수정하거나 삭제할 수 있어요" : "오늘의 자산 흐름을 추가하세요"}
          </SheetDescription>
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

          <div className="flex gap-2">
            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="h-12 px-4" disabled={busy}>
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>이 기록을 삭제할까요?</AlertDialogTitle>
                    <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={remove}>삭제</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" className="flex-1 h-12" disabled={busy}>
              {busy ? "저장중..." : isEdit ? "수정 저장" : "저장"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
