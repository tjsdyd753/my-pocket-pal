import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { TYPE_META, formatKRW, type TxType } from "@/lib/finance";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingUp, TrendingDown, PiggyBank, LineChart as LineIcon } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";

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
        <div className="glass-card p-7 relative overflow-hidden">
          <div
            className="absolute -top-20 -right-20 size-60 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <p className="text-sm text-muted-foreground">총 자산</p>
          <p className="text-4xl font-semibold tracking-tight mt-2">{formatKRW(stats.netAsset)}</p>
          <div className="flex gap-6 mt-5 text-xs">
            <div>
              <p className="text-muted-foreground">이번 달 수입</p>
              <p className="text-[color:var(--income)] font-medium mt-0.5">+{formatKRW(stats.monthIncome)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">이번 달 지출</p>
              <p className="text-[color:var(--expense)] font-medium mt-0.5">-{formatKRW(stats.monthSpend)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="px-6 mt-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingDown className="size-4" />}
          label="이번 달 소비"
          value={formatKRW(stats.monthSpend + stats.monthFixed)}
          tint="var(--expense)"
        />
        <StatCard
          icon={<PiggyBank className="size-4" />}
          label="총 적금"
          value={formatKRW(stats.totalSavings)}
          tint="var(--savings)"
        />
        <StatCard
          icon={<LineIcon className="size-4" />}
          label="총 투자"
          value={formatKRW(stats.totalInvestment)}
          tint="var(--investment)"
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="이번 달 순익"
          value={formatKRW(stats.monthNet)}
          tint={stats.monthNet >= 0 ? "var(--income)" : "var(--expense)"}
        />
      </section>

      {/* Charts */}
      <section className="px-6 mt-6 space-y-3">
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium mb-1">월별 자산 흐름</h3>
          <p className="text-xs text-muted-foreground mb-4">최근 6개월 누적 순자산</p>
          <div className="h-48">
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
                  <Area type="monotone" dataKey="net" stroke="var(--color-primary)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-medium mb-1">이번 달 소비 비율</h3>
          <p className="text-xs text-muted-foreground mb-4">카테고리별 지출</p>
          <div className="h-52 flex items-center">
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
                <ul className="flex-1 space-y-1.5 text-xs">
                  {stats.categoryPie.slice(0, 6).map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: pieColor(i) }} />
                      <span className="text-muted-foreground flex-1 truncate">{c.name}</span>
                      <span className="font-medium">{Math.round((c.value / stats.monthSpend) * 100) || 0}%</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </section>

      {/* Recent */}
      <section className="px-6 mt-6">
        <h3 className="text-sm font-medium mb-3">최근 내역</h3>
        <div className="glass-card divide-y divide-border">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">불러오는 중...</p>
          ) : txs.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">아직 기록이 없어요. + 버튼으로 추가해보세요.</p>
          ) : (
            txs.slice(0, 8).map((t) => <TxRow key={t.id} tx={t} />)
          )}
        </div>
      </section>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        <AddTransactionSheet />
      </div>
    </div>
  );
}


function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span style={{ color: tint }}>{icon}</span>
        {label}
      </div>
      <p className="text-lg font-semibold mt-1.5 tabular-nums">{value}</p>
    </div>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const [open, setOpen] = useState(false);
  const m = TYPE_META[tx.type];
  const sign = tx.type === "income" ? "+" : tx.type === "expense" || tx.type === "fixed_cost" ? "-" : "";
  return (
    <>
      <button
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
      <AddTransactionSheet transaction={tx} open={open} onOpenChange={setOpen} trigger={null} />
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

  const netAsset = totalIncome - totalSpend - totalFixed + totalSavings + totalInvestment;
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
      else net += a;
    }
    return { label, net };
  });

  const categoryPie = [...catMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    netAsset, monthIncome, monthSpend, monthFixed, monthNet,
    totalSavings, totalInvestment,
    monthlySeries, categoryPie,
  };
}
