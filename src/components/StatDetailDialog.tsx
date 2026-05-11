import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TYPE_META, formatKRW, type TxType } from "@/lib/finance";
import type { Transaction } from "@/hooks/use-transactions";

export type StatMode = "spend" | "savings" | "investment" | "net";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: StatMode;
  title: string;
  txs: Transaction[];
};

const MODE_TYPES: Record<StatMode, TxType[]> = {
  spend: ["expense", "fixed_cost"],
  savings: ["savings"],
  investment: ["investment"],
  net: ["income", "expense", "fixed_cost"],
};

const signedAmount = (t: Transaction, mode: StatMode) => {
  const a = Number(t.amount);
  if (mode === "net") {
    if (t.type === "income") return a;
    if (t.type === "expense" || t.type === "fixed_cost") return -a;
    return 0;
  }
  return a;
};

const tintFor = (mode: StatMode, value: number) => {
  if (mode === "spend") return "var(--expense)";
  if (mode === "savings") return "var(--savings)";
  if (mode === "investment") return "var(--investment)";
  return value >= 0 ? "var(--income)" : "var(--expense)";
};

export function StatDetailDialog({ open, onOpenChange, mode, title, txs }: Props) {
  const filtered = useMemo(
    () => txs.filter((t) => MODE_TYPES[mode].includes(t.type)),
    [txs, mode]
  );

  const total = useMemo(
    () => filtered.reduce((sum, t) => sum + signedAmount(t, mode), 0),
    [filtered, mode]
  );

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  // 일별 — 이번 달
  const daily = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const [y, m] = t.occurred_on.split("-").map(Number);
      if (y !== curYear || m - 1 !== curMonth) continue;
      map.set(t.occurred_on, (map.get(t.occurred_on) ?? 0) + signedAmount(t, mode));
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, value]) => ({ key: date, label: `${Number(date.slice(8))}일`, value }));
  }, [filtered, mode, curYear, curMonth]);

  // 월별 — 올해
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const [y, m] = t.occurred_on.split("-").map(Number);
      if (y !== curYear) continue;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + signedAmount(t, mode));
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, value]) => ({ key: k, label: `${Number(k.slice(5))}월`, value }));
  }, [filtered, mode, curYear]);

  // 년도별
  const yearly = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const y = t.occurred_on.slice(0, 4);
      map.set(y, (map.get(y) ?? 0) + signedAmount(t, mode));
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, value]) => ({ key: k, label: `${k}년`, value }));
  }, [filtered, mode]);

  const list = useMemo(
    () => [...filtered].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)),
    [filtered]
  );

  const sign = (v: number) => (mode === "net" ? (v >= 0 ? "+" : "-") : mode === "savings" || mode === "investment" ? "" : "-");
  const fmt = (v: number) => `${sign(v)}${formatKRW(Math.abs(v))}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>합산 및 기간별 내역</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-accent/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">합산</p>
          <p
            className="text-2xl font-semibold tabular-nums mt-0.5"
            style={{ color: tintFor(mode, total) }}
          >
            {fmt(total)}
          </p>
        </div>

        <Tabs defaultValue="daily" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="daily">일별</TabsTrigger>
            <TabsTrigger value="monthly">월별</TabsTrigger>
            <TabsTrigger value="yearly">년도별</TabsTrigger>
            <TabsTrigger value="list">리스트</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="flex-1 min-h-0 mt-3">
            <Buckets items={daily} mode={mode} fmt={fmt} emptyText="이번 달 기록이 없어요" />
          </TabsContent>
          <TabsContent value="monthly" className="flex-1 min-h-0 mt-3">
            <Buckets items={monthly} mode={mode} fmt={fmt} emptyText="올해 기록이 없어요" />
          </TabsContent>
          <TabsContent value="yearly" className="flex-1 min-h-0 mt-3">
            <Buckets items={yearly} mode={mode} fmt={fmt} emptyText="기록이 없어요" />
          </TabsContent>
          <TabsContent value="list" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[42vh] pr-2">
              {list.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">기록이 없어요</p>
              ) : (
                <ul className="space-y-1">
                  {list.map((t) => {
                    const meta = TYPE_META[t.type];
                    const v = signedAmount(t, mode);
                    return (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/40"
                      >
                        <div className="size-8 rounded-full bg-accent flex items-center justify-center text-sm">
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.category}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t.memo || meta.label} · {t.occurred_on}
                          </p>
                        </div>
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: tintFor(mode, v) }}
                        >
                          {fmt(v)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Buckets({
  items,
  mode,
  fmt,
  emptyText,
}: {
  items: { key: string; label: string; value: number }[];
  mode: StatMode;
  fmt: (v: number) => string;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">{emptyText}</p>;
  }
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ScrollArea className="h-[42vh] pr-2">
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.key} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{i.label}</span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: tintFor(mode, i.value) }}
              >
                {fmt(i.value)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-accent/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(Math.abs(i.value) / max) * 100}%`,
                  background: tintFor(mode, i.value),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
