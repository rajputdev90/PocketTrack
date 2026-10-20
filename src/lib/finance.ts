import type { FinanceData, Tx } from "./types";
export const monthKey = (d: Date | string) => {
  const x = typeof d === "string" ? new Date(`${d}T12:00:00`) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
export const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
export const dateLabel = (d: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${d}T12:00:00`));
export const txInMonth = (t: Tx[], month: string) =>
  t.filter((x) => monthKey(x.date) === month);
export const expenses = (t: Tx[]) => t.filter((x) => x.type === "expense");
export const sum = (t: Tx[]) =>
  t.reduce((a, x) => a + Math.round(x.amount * 100), 0) / 100;
export const sourceBalance = (d: FinanceData, sourceId: string) => {
  const source = d.sources.find((item) => item.id === sourceId);
  if (!source) return 0;
  const cents = d.events.reduce((balance, event) => {
    const amount = Math.round(event.amount * 100);
    if (event.sourceId === sourceId) {
      if (event.kind === "contribution") return balance + amount;
      if (event.kind === "withdrawal" || event.kind === "transfer")
        return balance - amount;
      if (event.kind === "valuation") return balance + amount;
    }
    if (event.kind === "transfer" && event.targetSourceId === sourceId)
      return balance + amount;
    return balance;
  }, Math.round(source.openingBalance * 100));
  return cents / 100;
};
export const totals = (d: FinanceData, month: string) => {
  const t = txInMonth(d.transactions, month);
  const inc = sum(t.filter((x) => x.type === "income"));
  const spent = sum(expenses(t));
  const budget = d.budgets.find((x) => x.month === month)?.total;
  const eventTotal = (items: FinanceData["events"]) =>
    items.reduce((a, e) => a + Math.round(e.amount * 100), 0) / 100;
  const contributions = eventTotal(
    d.events.filter(
      (e) => e.date.startsWith(month) && e.kind === "contribution",
    ),
  );
  const withdrawals = eventTotal(
    d.events.filter((e) => e.date.startsWith(month) && e.kind === "withdrawal"),
  );
  const savingsCents = d.sources
    .filter((s) => !s.archived)
    .reduce((cents, s) => cents + Math.round(sourceBalance(d, s.id) * 100), 0);
  return {
    transactions: t,
    income: inc,
    spent,
    budget,
    remaining:
      budget === undefined
        ? undefined
        : Math.round((budget - spent) * 100) / 100,
    net: Math.round((inc - spent) * 100) / 100,
    contributions,
    withdrawals,
    savings: savingsCents / 100,
  };
};
export const byCategory = (t: Tx[]) => {
  const cents = new Map<string, number>();
  expenses(t).forEach((x) =>
    cents.set(
      x.category,
      (cents.get(x.category) || 0) + Math.round(x.amount * 100),
    ),
  );
  const map = [...cents].map(([name, value]) => [name, value / 100] as const);
  return [...map]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};
