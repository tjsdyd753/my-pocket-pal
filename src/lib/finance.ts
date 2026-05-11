export type TxType = "income" | "expense" | "savings" | "investment" | "fixed_cost";

export const TYPE_META: Record<TxType, { label: string; color: string; emoji: string }> = {
  income: { label: "수입", color: "var(--income)", emoji: "💰" },
  expense: { label: "지출", color: "var(--expense)", emoji: "🛍️" },
  savings: { label: "적금", color: "var(--savings)", emoji: "🐖" },
  investment: { label: "투자", color: "var(--investment)", emoji: "📈" },
  fixed_cost: { label: "고정비", color: "var(--fixed)", emoji: "🏠" },
};

export const CATEGORIES: Record<TxType, string[]> = {
  income: ["급여", "보너스", "부수입", "기타"],
  expense: ["식비", "카페", "교통", "쇼핑", "문화", "의료", "기타"],
  savings: ["정기적금", "예금", "비상금", "기타"],
  investment: ["주식", "ETF", "암호화폐", "부동산", "기타"],
  fixed_cost: ["월세", "관리비", "통신비", "구독", "보험", "기타"],
};

export const formatKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
