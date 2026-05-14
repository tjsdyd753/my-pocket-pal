import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { TYPE_META, formatKRW, type TxType } from "@/lib/finance";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { DailyCalendar } from "@/components/DailyCalendar";
import { StatDetailDialog, type StatMode } from "@/components/StatDetailDialog";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingUp, TrendingDown, PiggyBank, LineChart as LineIcon, ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: txs = [], isLoading } = useTransactions();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const stats = useMemo(() => computeStats(txs), [txs]);
  const [statsOpen, setStatsOpen] = useState(false);
  
  const [pieOpen, setPieOpen] = useState(false);
  const [pieScope, setPieScope] = useState<"year" | "month">("month");
  const now = new Date();
  const [pieYear, setPieYear] = useState<number>(now.getFullYear());
  const [pieMonth, setPieMonth] = useState<number>(now.getMonth() + 1);
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense" && t.type !== "fixed_cost") continue;
      const [y, m] = t.occurred_on.split("-");
      if (Number(y) !== pieYear) continue;
      if (pieScope === "month" && Number(m) !== pieMonth) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [txs, pieScope, pieYear, pieMonth]);
  const pieTotal = pieData.reduce((s, c) => s + c.value, 0);
  const yearOptions = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()]);
    for (const t of txs) ys.add(Number(t.occurred_on.slice(0, 4)));
    return [...ys].sort((a, b) => b - a);
  }, [txs]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [calSelected, setCalSelected] = useState<Date>(() => new Date());
  const [calMonth, setCalMonth] = useState<Date>(() => new Date());
  const calSelectedKey = `${calSelected.getFullYear()}-${String(calSelected.getMonth() + 1).padStart(2, "0")}-${String(calSelected.getDate()).padStart(2, "0")}`;

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로딩중...</div>;
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">안녕하세요</p>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="size-4" />
        </Button>
      </header>

      {/* Total Asset Hero */}
      <section className="px-6">
        <button
          type="button"
          onClick={() => setStatsOpen((v) => !v)}
          className="w-full text-left glass-card p-7 relative overflow-hidden transition-transform active:scale-[0.99]"
        >
          <div
            className="absolute -top-20 -right-20 size-60 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">총 자산</p>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${statsOpen ? "rotate-180" : ""}`}
            />
          </div>
          <p className="text-4xl font-semibold tracking-tight mt-2">{formatKRW(stats.netAsset)}</p>
        </button>
      </section>

      {/* Quick stats (accordion under 총 자산) */}
      {statsOpen && (
        <section className="px-6 mt-4 grid grid-cols-2 gap-3 animate-fade-in">
          <StatCard
            icon={<TrendingDown className="size-4" />}
            label="총 소비"
            value={formatKRW(stats.totalSpend + stats.totalFixed)}
            tint="var(--expense)"
            mode="spend"
            txs={txs}
          />
          <StatCard
            icon={<PiggyBank className="size-4" />}
            label="총 적금"
            value={formatKRW(stats.totalSavings)}
            tint="var(--savings)"
            mode="savings"
            txs={txs}
          />
          <StatCard
            icon={<LineIcon className="size-4" />}
            label="총 투자"
            value={formatKRW(stats.totalInvestment)}
            tint="var(--investment)"
            mode="investment"
            txs={txs}
          />
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="총 순익"
            value={formatKRW(stats.totalNet)}
            tint={stats.totalNet >= 0 ? "var(--income)" : "var(--expense)"}
            mode="net"
            txs={txs}
          />
        </section>
      )}

      {/* Calendar (full width) */}
      <section className="mt-4">
        <DailyCalendar
          txs={txs}
          selected={calSelected}
          onSelectedChange={setCalSelected}
          month={calMonth}
          onMonthChange={setCalMonth}
        />
      </section>

      {/* Charts */}
      <section className="px-6 mt-6 space-y-3">
        <div className="glass-card overflow-hidden">
          <button
            type="button"
            onClick={() => setFlowOpen((v) => !v)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
          >
            <div>
              <h3 className="text-sm font-medium">월별 자산 흐름</h3>
              <p className="text-xs text-muted-foreground mt-0.5">최근 6개월 누적 순자산</p>
            </div>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${flowOpen ? "rotate-180" : ""}`}
            />
          </button>
          {flowOpen && (
            <div className="px-5 pb-5 h-48 animate-fade-in">
              {stats.monthlySeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlySeries}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatKRW(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#g1)"
                      isAnimationActive
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          )}
        </div>

        <div className="glass-card overflow-hidden">
          <button
            type="button"
            onClick={() => setPieOpen((v) => !v)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
          >
            <div>
              <h3 className="text-sm font-medium">이번 달 소비 비율</h3>
              <p className="text-xs text-muted-foreground mt-0.5">카테고리별 지출</p>
            </div>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${pieOpen ? "rotate-180" : ""}`}
            />
          </button>
          {pieOpen && (
            <div className="px-5 pb-5 h-52 flex items-center animate-fade-in">
              {stats.categoryPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="55%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryPie}
                        dataKey="value"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive
                        animationDuration={600}
                        animationEasing="ease-out"
                      >
                        {stats.categoryPie.map((_, i) => (
                          <Cell key={i} fill={pieColor(i)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatKRW(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul
                    key={stats.categoryPie.map((c) => `${c.name}:${c.value}`).join("|")}
                    className="flex-1 space-y-1.5 text-xs animate-fade-in"
                  >
                    {stats.categoryPie.slice(0, 6).map((c, i) => (
                      <li
                        key={c.name}
                        className="flex items-center gap-2 transition-colors duration-300"
                      >
                        <span className="size-2 rounded-full" style={{ background: pieColor(i) }} />
                        <span className="text-muted-foreground flex-1 truncate">{c.name}</span>
                        <span className="font-medium tabular-nums">{Math.round((c.value / stats.monthSpend) * 100) || 0}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyChart />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Calendar moved above */}

      {/* Recent (accordion) */}
      <section className="px-6 mt-6">
        <div className="glass-card overflow-hidden">
          <button
            type="button"
            onClick={() => setRecentOpen((v) => !v)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
          >
            <h3 className="text-sm font-medium">최근 내역</h3>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${recentOpen ? "rotate-180" : ""}`}
            />
          </button>
          {recentOpen && (
            <div className="divide-y divide-border border-t border-border animate-fade-in">
              {isLoading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">불러오는 중...</p>
              ) : txs.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">아직 기록이 없어요. + 버튼으로 추가해보세요.</p>
              ) : (
                txs.slice(0, 8).map((t) => <TxRow key={t.id} tx={t} />)
              )}
            </div>
          )}
        </div>
      </section>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        <AddTransactionSheet defaultDate={calSelectedKey} />
      </div>
    </div>
  );
}


function StatCard({
  icon, label, value, tint, mode, txs,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
  mode: StatMode;
  txs: Transaction[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-card p-4 text-left transition-transform active:scale-[0.98] hover:bg-accent/30"
      >
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span style={{ color: tint }}>{icon}</span>
          {label}
        </div>
        <p className="text-lg font-semibold mt-1.5 tabular-nums">{value}</p>
      </button>
      <StatDetailDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        title={label}
        txs={txs}
      />
    </>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const m = TYPE_META[tx.type];
  const sign = tx.type === "income" ? "+" : tx.type === "expense" || tx.type === "fixed_cost" ? "-" : "";
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="size-10 rounded-full bg-accent flex items-center justify-center text-base">{m.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tx.category}</p>
          <p className="text-xs text-muted-foreground truncate">{tx.memo || m.label} · {tx.occurred_on.slice(5)}</p>
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
          if (!v) {
            // restore focus to the row after the sheet closes
            requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
          }
        }}
        trigger={null}
      />
    </>
  );
}

function EmptyChart() {
  return <p className="w-full text-center text-xs text-muted-foreground">데이터를 추가하면 표시됩니다</p>;
}

function pieColor(i: number) {
  const palette = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
  return palette[i % palette.length];
}

function computeStats(txs: Transaction[]) {
  const now = new Date();
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const curYm = ym(now);

  let totalIncome = 0, totalSpend = 0, totalSavings = 0, totalInvestment = 0, totalFixed = 0;
  let monthIncome = 0, monthSpend = 0, monthFixed = 0;
  const catMap = new Map<string, number>();

  for (const t of txs) {
    const a = Number(t.amount);
    const m = t.occurred_on.slice(0, 7);
    if (t.type === "income") totalIncome += a;
    else if (t.type === "expense") totalSpend += a;
    else if (t.type === "savings") totalSavings += a;
    else if (t.type === "investment") totalInvestment += a;
    else if (t.type === "fixed_cost") totalFixed += a;

    if (m === curYm) {
      if (t.type === "income") monthIncome += a;
      else if (t.type === "expense") {
        monthSpend += a;
        catMap.set(t.category, (catMap.get(t.category) ?? 0) + a);
      } else if (t.type === "fixed_cost") {
        monthFixed += a;
        catMap.set(t.category, (catMap.get(t.category) ?? 0) + a);
      }
    }
  }

  const netAsset = totalIncome - totalSpend - totalFixed;
  const monthNet = monthIncome - monthSpend - monthFixed;

  // last 6 months series (cumulative net)
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: ym(d), label: `${d.getMonth() + 1}월` });
  }
  const sorted = [...txs].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const monthlySeries = months.map(({ key, label }) => {
    let net = 0;
    for (const t of sorted) {
      if (t.occurred_on.slice(0, 7) > key) break;
      const a = Number(t.amount);
      if (t.type === "income") net += a;
      else if (t.type === "expense" || t.type === "fixed_cost") net -= a;
    }
    return { label, net };
  });

  const categoryPie = [...catMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalNet = totalIncome - totalSpend - totalFixed;

  return {
    netAsset, monthIncome, monthSpend, monthFixed, monthNet,
    totalSpend, totalFixed, totalNet,
    totalSavings, totalInvestment,
    monthlySeries, categoryPie,
  };
}
