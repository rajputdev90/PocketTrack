import { format } from "date-fns";
import { byCategory, money, sourceBalance, totals } from "./finance";
import type { FinanceData } from "./types";

/** Build a report for one selected month from the same data and calculations as the UI. */
export async function createMonthlyPdf(
  data: FinanceData,
  month: string,
  generatedAt = new Date(),
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Choose a valid report month.");
  }
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const t = totals(data, month);
  const cats = byCategory(t.transactions);
  const label = format(new Date(`${month}-01T12:00:00`), "MMMM yyyy");
  const filename = `PocketTrack-${label.replace(" ", "-")}.pdf`;
  const purple: [number, number, number] = [94, 75, 202];
  const pdfMoney = (n: number) => money(n, data.currency).replace("₹", "INR ");
  const bottom = doc.internal.pageSize.height - 48;
  const table = (opts: Parameters<typeof autoTable>[1]) =>
    autoTable(doc, {
      ...opts,
      margin: { ...(opts.margin as object), bottom: 45 },
      headStyles: { fillColor: purple, ...(opts.headStyles as object) },
    });
  const nextSection = () => {
    let y = (doc as any).lastAutoTable.finalY + 20;
    if (y > bottom - 42) {
      doc.addPage();
      y = 48;
    }
    return y;
  };

  doc.setFillColor(...purple);
  doc.rect(0, 0, doc.internal.pageSize.width, 106, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("PocketTrack", 42, 45);
  doc.setFontSize(12);
  doc.text(`${label} financial report`, 42, 68);
  doc.setFontSize(9);
  doc.text(
    `Generated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(generatedAt)}`,
    42,
    87,
  );
  doc.setTextColor(35, 35, 45);
  doc.setFontSize(13);
  doc.text("Monthly summary", 42, 137);
  table({
    startY: 148,
    head: [["Monthly budget", "Qualifying spending", "Remaining budget", "Recorded income", "Net cash flow"]],
    body: [[
      t.budget === undefined ? "Not set" : pdfMoney(t.budget),
      pdfMoney(t.spent),
      t.remaining === undefined ? "Not available" : pdfMoney(t.remaining),
      pdfMoney(t.income),
      pdfMoney(t.net),
    ]],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 7 },
  });

  let y = nextSection();
  doc.setFontSize(12);
  doc.text("Expense plan breakdown", 42, y);
  table({
    startY: y + 8,
    head: [["Planned expenses", "Extra / unplanned", "Total qualifying spending"]],
    body: [[pdfMoney(t.plannedSpent), pdfMoney(t.extraSpent), pdfMoney(t.spent)]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 6 },
  });

  y = nextSection();
  doc.setFontSize(12);
  doc.text("Savings activity & tracked sources", 42, y);
  table({
    startY: y + 9,
    head: [["Contributions", "Withdrawals", "Active tracked source values"]],
    body: [[
      pdfMoney(t.contributions),
      pdfMoney(t.withdrawals),
      data.sources
        .filter((source) => !source.archived)
        .map((source) => `${source.name}: ${pdfMoney(sourceBalance(data, source.id))}`)
        .join("\n") || "No active sources",
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 7, overflow: "linebreak" },
  });

  y = nextSection();
  doc.setFontSize(12);
  doc.text("Spending by category", 42, y);
  table({
    startY: y + 9,
    head: [["Category", "Amount", "Share of spending"]],
    body: cats.length
      ? cats.map((c) => [c.name, pdfMoney(c.value), t.spent ? `${((c.value / t.spent) * 100).toFixed(1)}%` : "—"])
      : [["No recorded spending", "—", "—"]],
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 6 },
  });

  y = nextSection();
  doc.setFontSize(12);
  doc.text("Budget category performance", 42, y);
  const budget = data.budgets.find((b) => b.month === month);
  const perf = budget
    ? Object.entries(budget.categories).map(([category, amount]) => {
        const spent = cats.find((item) => item.name === category)?.value || 0;
        return [category, pdfMoney(amount), pdfMoney(spent), spent > amount ? `${pdfMoney(spent - amount)} over` : `${pdfMoney(amount - spent)} left`];
      })
    : [["No category budgets configured", "—", "—", "—"]];
  table({
    startY: y + 8,
    head: [["Category", "Budget", "Actual", "Status"]],
    body: perf,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 6 },
  });

  y = nextSection();
  const goals = data.goals.filter((g) => g.status === "active");
  doc.setFontSize(12);
  doc.text("Goal progress", 42, y);
  table({
    startY: y + 8,
    head: [["Goal", "Progress", "Target date"]],
    body: goals.length
      ? goals.map((g) => [g.name, `${pdfMoney(g.current)} / ${pdfMoney(g.target)} (${Math.round((g.current / Math.max(g.target, 1)) * 100)}%)`, g.targetDate || "Not set"])
      : [["No active goals", "—", "—"]],
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 6 },
  });

  y = nextSection();
  doc.setFontSize(12);
  doc.text("Transactions", 42, y);
  const txRows = [...t.transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => [x.date, x.description || "(No description)", x.category || "—", x.type === "expense" && x.isUnplanned ? "Expense · extra" : x.type, `${x.type === "expense" ? "−" : x.type === "income" ? "+" : ""}${pdfMoney(x.amount)}`]);
  table({
    startY: y + 8,
    head: [["Date", "Description", "Category", "Type", "Amount"]],
    body: txRows.length ? txRows : [["—", "No recorded activity this month", "—", "—", "—"]],
    theme: "striped",
    styles: { fontSize: 7, cellPadding: 5, overflow: "linebreak" },
    columnStyles: { 1: { cellWidth: 190 } },
  });

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text("Net cash flow = recorded income minus qualifying expenses. Transfers are excluded from income and spending.", 42, doc.internal.pageSize.height - 28, { maxWidth: doc.internal.pageSize.width - 130 });
    doc.text(`Page ${page} of ${doc.getNumberOfPages()}`, doc.internal.pageSize.width - 86, doc.internal.pageSize.height - 28);
  }
  return { doc, filename };
}
