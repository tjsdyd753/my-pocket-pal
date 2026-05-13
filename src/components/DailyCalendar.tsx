import { useMemo, useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { TYPE_META, formatKRW } from "@/lib/finance";
import type { Transaction } from "@/hooks/use-transactions";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { cn } from "@/lib/utils";

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Props = {
  txs: Transaction[];
  selected: Date;
  onSelectedChange: (d: Date) => void;
  month: Date;
  onMonthChange: (d: Date) => void;
};

export function DailyCalendar({ txs, selected, onSelectedChange, month, onMonthChange }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of txs) {
      const arr = map.get(t.occurred_on) ?? [];
      arr.push(t);
      map.set(t.occurred_on, arr);
    }
    return map;
  }, [txs]);

  const totals = useMemo(() => {
    const map = new Map<string, { income: number; out: number }>();
    for (const [day, arr] of byDay) {
      let income = 0, out = 0;
      for (const t of arr) {
        const a = Number(t.amount);
        if (t.type === "income") income += a;
        else if (t.type === "expense" || t.type === "fixed_cost") out += a;
      }
      map.set(day, { income, out });
    }
    return map;
  }, [byDay]);

  // Totals for the currently viewed month
  const monthTotals = useMemo(() => {
    const ym = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    let income = 0, out = 0;
    for (const t of txs) {
      if (!t.occurred_on.startsWith(ym)) continue;
      const a = Number(t.amount);
      if (t.type === "income") income += a;
      else if (t.type === "expense" || t.type === "fixed_cost") out += a;
    }
    return { income, out };
  }, [txs, month]);

  const key = toKey(selected);
  const dayTxs = byDay.get(key) ?? [];
  const dayTotal = totals.get(key);

  const incomeDays: Date[] = [];
  const outDays: Date[] = [];
  for (const [day, t] of totals) {
    const [y, m, d] = day.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (t.income > 0) incomeDays.push(date);
    if (t.out > 0) outDays.push(date);
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">달력으로 보기</h3>
        <p className="text-xs text-muted-foreground">날짜를 선택하세요</p>
      </div>

      {/* Month income/expense summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-accent/40 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">{month.getMonth() + 1}월 수입</p>
          <p className="text-sm font-semibold tabular-nums text-[color:var(--income)] mt-0.5">
            +{formatKRW(monthTotals.income)}
          </p>
        </div>
        <div className="rounded-xl bg-accent/40 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">{month.getMonth() + 1}월 지출</p>
          <p className="text-sm font-semibold tabular-nums text-[color:var(--expense)] mt-0.5">
            -{formatKRW(monthTotals.out)}
          </p>
        </div>
      </div>

      <div className="w-full">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && onSelectedChange(d)}
          month={month}
          onMonthChange={onMonthChange}
          showOutsideDays
          modifiers={{ income: incomeDays, out: outDays }}
          modifiersClassNames={{
            income: "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-[color:var(--income)]",
            out: "before:absolute before:bottom-1 before:left-[calc(50%-6px)] before:size-1 before:rounded-full before:bg-[color:var(--expense)]",
          }}
          className={cn("p-0 w-full pointer-events-auto [&_table]:w-full [&_.rdp-month]:w-full [&_.rdp-cell]:w-[14.2857%] [&_.rdp-head_cell]:w-[14.2857%] [&_.rdp-day]:w-full")}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm font-medium">
            {selected.getMonth() + 1}월 {selected.getDate()}일
          </p>
          {dayTotal && (dayTotal.income || dayTotal.out) ? (
            <div className="flex gap-3 text-xs tabular-nums">
              {dayTotal.income > 0 && (
                <span className="text-[color:var(--income)]">+{formatKRW(dayTotal.income)}</span>
              )}
              {dayTotal.out > 0 && (
                <span className="text-[color:var(--expense)]">-{formatKRW(dayTotal.out)}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">기록 없음</span>
          )}
        </div>

        {dayTxs.length > 0 && (
          <ul className="space-y-1 animate-fade-in">
            {dayTxs.map((tx) => (
              <DayTxRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DayTxRow({ tx }: { tx: Transaction }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const m = TYPE_META[tx.type];
  const sign = tx.type === "income" ? "+" : tx.type === "expense" || tx.type === "fixed_cost" ? "-" : "";
  return (
    <li>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-accent/40 transition-colors"
      >
        <div className="size-8 rounded-full bg-accent flex items-center justify-center text-sm">{m.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tx.category}</p>
          <p className="text-xs text-muted-foreground truncate">{tx.memo || m.label}</p>
        </div>
        <p className="text-sm font-semibold tabular-nums" style={{ color: m.color }}>
          {sign}{formatKRW(tx.amount)}
        </p>
      </button>
      <AddTransactionSheet
        transaction={tx}
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
        }}
        trigger={null}
      />
    </li>
  );
}
