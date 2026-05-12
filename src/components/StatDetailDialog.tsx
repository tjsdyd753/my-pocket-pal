import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

type DayNode = { key: string; day: number; total: number };
type MonthNode = { key: string; month: number; total: number; days: DayNode[] };
type YearNode = { key: string; year: number; total: number; months: MonthNode[] };

export function StatDetailDialog({ open, onOpenChange, mode, title, txs }: Props) {
  const filtered = useMemo(
    () => txs.filter((t) => MODE_TYPES[mode].includes(t.type)),
    [txs, mode]
  );

  const total = useMemo(
    () => filtered.reduce((sum, t) => sum + signedAmount(t, mode), 0),
    [filtered, mode]
  );

  const tree = useMemo<YearNode[]>(() => {
    const years = new Map<string, Map<string, Map<string, number>>>();
    for (const t of filtered) {
      const y = t.occurred_on.slice(0, 4);
      const m = t.occurred_on.slice(5, 7);
      const d = t.occurred_on;
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y)!;
      if (!months.has(m)) months.set(m, new Map());
      const days = months.get(m)!;
      days.set(d, (days.get(d) ?? 0) + signedAmount(t, mode));
    }
    return [...years.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([y, months]) => {
        const monthNodes: MonthNode[] = [...months.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([m, days]) => {
            const dayNodes: DayNode[] = [...days.entries()]
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([k, total]) => ({ key: k, day: Number(k.slice(8)), total }));
            const mTotal = dayNodes.reduce((s, d) => s + d.total, 0);
            return { key: `${y}-${m}`, month: Number(m), total: mTotal, days: dayNodes };
          });
        const yTotal = monthNodes.reduce((s, m) => s + m.total, 0);
        return { key: y, year: Number(y), total: yTotal, months: monthNodes };
      });
  }, [filtered, mode]);

  const now = new Date();
  const curYearKey = String(now.getFullYear());
  const curMonthKey = `${curYearKey}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [openYears, setOpenYears] = useState<Record<string, boolean>>({ [curYearKey]: true });
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({ [curMonthKey]: true });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const toggleYear = (k: string) =>
    setOpenYears((s) => ({ ...s, [k]: !s[k] }));
  const toggleMonth = (k: string) =>
    setOpenMonths((s) => ({ ...s, [k]: !s[k] }));

  const dayList = useMemo(() => {
    if (!selectedDay) return [];
    return filtered
      .filter((t) => t.occurred_on === selectedDay)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [filtered, selectedDay]);

  const sign = (v: number) =>
    mode === "net" ? (v >= 0 ? "+" : "-") : mode === "savings" || mode === "investment" ? "" : "-";
  const fmt = (v: number) => `${sign(v)}${formatKRW(Math.abs(v))}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>년 · 월 · 일별 합산 내역</DialogDescription>
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

        <ScrollArea className="flex-1 min-h-0 pr-2 -mr-2">
          {tree.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">기록이 없어요</p>
          ) : (
            <ul className="space-y-1">
              {tree.map((y) => {
                const yOpen = !!openYears[y.key];
                return (
                  <li key={y.key}>
                    <button
                      type="button"
                      onClick={() => toggleYear(y.key)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent/40 transition-colors"
                    >
                      <ChevronRight
                        className={`size-4 text-muted-foreground transition-transform ${yOpen ? "rotate-90" : ""}`}
                      />
                      <span className="text-sm font-medium flex-1 text-left">{y.year}년</span>
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: tintFor(mode, y.total) }}
                      >
                        {fmt(y.total)}
                      </span>
                    </button>
                    {yOpen && (
                      <ul className="pl-5 space-y-1 mt-1">
                        {y.months.map((m) => {
                          const mOpen = !!openMonths[m.key];
                          return (
                            <li key={m.key}>
                              <button
                                type="button"
                                onClick={() => toggleMonth(m.key)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/40 transition-colors"
                              >
                                <ChevronRight
                                  className={`size-3.5 text-muted-foreground transition-transform ${mOpen ? "rotate-90" : ""}`}
                                />
                                <span className="text-sm flex-1 text-left">{m.month}월</span>
                                <span
                                  className="text-sm tabular-nums"
                                  style={{ color: tintFor(mode, m.total) }}
                                >
                                  {fmt(m.total)}
                                </span>
                              </button>
                              {mOpen && (
                                <ul className="pl-6 space-y-0.5 mt-0.5">
                                  {m.days.map((d) => {
                                    const isSel = selectedDay === d.key;
                                    return (
                                      <li key={d.key}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedDay((cur) => (cur === d.key ? null : d.key))
                                          }
                                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                                            isSel
                                              ? "bg-accent/60 ring-1 ring-border"
                                              : "hover:bg-accent/40"
                                          }`}
                                        >
                                          <span className="text-xs text-muted-foreground flex-1 text-left">
                                            {d.day}일
                                          </span>
                                          <span
                                            className="text-xs tabular-nums"
                                            style={{ color: tintFor(mode, d.total) }}
                                          >
                                            {fmt(d.total)}
                                          </span>
                                        </button>
                                        {isSel && (
                                          <ul className="ml-2 my-1 space-y-1 border-l pl-3">
                                            {dayList.length === 0 ? (
                                              <li className="text-xs text-muted-foreground py-1">
                                                기록이 없어요
                                              </li>
                                            ) : (
                                              dayList.map((t) => {
                                                const meta = TYPE_META[t.type];
                                                const v = signedAmount(t, mode);
                                                return (
                                                  <li
                                                    key={t.id}
                                                    className="flex items-center gap-2 px-1 py-1.5 rounded-md"
                                                  >
                                                    <div className="size-7 rounded-full bg-accent flex items-center justify-center text-xs">
                                                      {meta.emoji}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-xs font-medium truncate">
                                                        {t.category}
                                                      </p>
                                                      <p className="text-[11px] text-muted-foreground truncate">
                                                        {t.memo || meta.label}
                                                      </p>
                                                    </div>
                                                    <p
                                                      className="text-xs font-semibold tabular-nums"
                                                      style={{ color: tintFor(mode, v) }}
                                                    >
                                                      {fmt(v)}
                                                    </p>
                                                  </li>
                                                );
                                              })
                                            )}
                                          </ul>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
