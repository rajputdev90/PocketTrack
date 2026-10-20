import { describe, it, expect } from "vitest";
import { byCategory, monthKey, sourceBalance, totals, txInMonth } from "./finance";
import { EMPTY_DATA, type FinanceData, type Tx } from "./types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createMonthlyPdf } from "./monthlyReport";
import { HALLOWEEN_THEME_DAYS, halloweenThemeExpiry, isHalloweenThemeActive } from "./seasonalTheme";
const tx = (
  id: string,
  date: string,
  amount: number,
  type: Tx["type"],
  category = "Food",
): Tx => ({
  id,
  date,
  description: id,
  amount,
  type,
  category,
  createdAt: "",
  updatedAt: "",
});
describe("monthly finance calculations", () => {
  it("filters exactly to the selected month", () => {
    const items = [
      tx("a", "2026-10-02", 100, "expense"),
      tx("b", "2026-09-30", 300, "expense"),
    ];
    expect(txInMonth(items, "2026-10")).toHaveLength(1);
    expect(monthKey("2026-10-02")).toBe("2026-10");
  });
  it("excludes transfers from spending and income totals", () => {
    const data: FinanceData = {
      ...EMPTY_DATA,
      transactions: [
        tx("meal", "2026-10-02", 120, "expense"),
        tx("pay", "2026-10-03", 1000, "income"),
        tx("move", "2026-10-04", 500, "transfer"),
      ],
    };
    expect(totals(data, "2026-10")).toMatchObject({
      spent: 120,
      income: 1000,
      net: 880,
    });
  });
  it("leaves missing budget and empty month distinguishable", () => {
    const result = totals(EMPTY_DATA, "2026-10");
    expect(result.budget).toBeUndefined();
    expect(result.spent).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });
  it("aggregates categories from expenses only", () => {
    expect(
      byCategory([
        tx("a", "2026-10-02", 30, "expense"),
        tx("b", "2026-10-02", 20, "expense"),
        tx("c", "2026-10-02", 99, "income"),
      ]),
    ).toEqual([{ name: "Food", value: 50 }]);
  });
  it("adds fractional amounts in integer cents", () => {
    expect(
      byCategory([
        tx("a", "2026-10-02", 0.1, "expense"),
        tx("b", "2026-10-02", 0.2, "expense"),
      ]),
    ).toEqual([{ name: "Food", value: 0.3 }]);
  });
  it("tracks unplanned expenses separately while including them in budget totals", () => {
    const data: FinanceData = {
      ...EMPTY_DATA,
      transactions: [
        { ...tx("planned", "2026-10-02", 75, "expense"), isUnplanned: false },
        { ...tx("unexpected", "2026-10-03", 25, "expense"), isUnplanned: true },
        { ...tx("transfer", "2026-10-04", 500, "transfer"), isUnplanned: true },
      ],
      budgets: [{ id: "b", month: "2026-10", total: 90, categories: {} }],
    };
    expect(totals(data, "2026-10")).toMatchObject({
      spent: 100,
      plannedSpent: 75,
      extraSpent: 25,
      remaining: -10,
      net: -100,
    });
  });
  it("keeps savings contributions distinct from expenses", () => {
    const data: FinanceData = {
      ...EMPTY_DATA,
      sources: [
        {
          id: "s",
          name: "Cash",
          type: "Cash",
          openingBalance: 200,
          archived: false,
        },
      ],
      events: [
        {
          id: "e",
          sourceId: "s",
          date: "2026-10-02",
          kind: "contribution",
          amount: 100,
        },
      ],
    };
    expect(totals(data, "2026-10")).toMatchObject({
      spent: 0,
      contributions: 100,
      savings: 300,
    });
  });
  it("moves value between tracked savings sources without inflating total savings", () => {
    const data: FinanceData = {
      ...EMPTY_DATA,
      sources: [
        { id: "a", name: "Bank", type: "Savings Account", openingBalance: 1000, archived: false },
        { id: "b", name: "Emergency", type: "Emergency Fund", openingBalance: 250, archived: false },
      ],
      events: [
        {
          id: "move",
          sourceId: "a",
          targetSourceId: "b",
          date: "2026-10-20",
          kind: "transfer",
          amount: 300,
        },
      ],
    };
    expect(sourceBalance(data, "a")).toBe(700);
    expect(sourceBalance(data, "b")).toBe(550);
    expect(totals(data, "2026-10")).toMatchObject({
      income: 0,
      spent: 0,
      contributions: 0,
      withdrawals: 0,
      savings: 1250,
    });
  });
  it("paginates a long report transaction table", () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["Date", "Description", "Category", "Type", "Amount"]],
      body: Array.from({ length: 150 }, (_, i) => [
        "2026-10-01",
        `Student transaction ${i + 1}`,
        "Food",
        "expense",
        "INR 125",
      ]),
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
  it("builds a valid report for an empty selected month", async () => {
    const { doc, filename } = await createMonthlyPdf(EMPTY_DATA, "2026-10");
    expect(filename).toBe("PocketTrack-October-2026.pdf");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
  it("reports planned and extra expenses separately without changing total spending", async () => {
    const reportData: FinanceData = {
      ...EMPTY_DATA,
      transactions: [
        tx("planned lunch", "2026-10-02", 80, "expense"),
        { ...tx("unexpected repair", "2026-10-03", 120, "expense"), isUnplanned: true },
      ],
    };
    const { doc } = await createMonthlyPdf(reportData, "2026-10");
    const content = doc.output();
    expect(content).toContain("Expense plan breakdown");
    expect(content).toContain("Extra / unplanned");
    expect(content).toContain("Expense · extra");
  });
  it("includes selected-month data and paginates all report transactions", async () => {
    const many: FinanceData = {
      ...EMPTY_DATA,
      transactions: Array.from({ length: 150 }, (_, i) =>
        tx(`Meal ${i + 1}`, "2026-10-12", 125, "expense"),
      ).concat(tx("Other month", "2026-09-30", 900, "expense")),
    };
    const { doc } = await createMonthlyPdf(many, "2026-10");
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});

describe("seasonal Halloween theme", () => {
  it("expires 15 days after it is enabled", () => {
    const started = new Date("2026-10-20T12:00:00.000Z");
    const expiresAt = halloweenThemeExpiry(started);
    expect(HALLOWEEN_THEME_DAYS).toBe(15);
    expect(expiresAt).toBe("2026-11-04T12:00:00.000Z");
    expect(isHalloweenThemeActive(expiresAt, started.getTime())).toBe(true);
    expect(isHalloweenThemeActive(expiresAt, Date.parse(expiresAt))).toBe(false);
  });
});
