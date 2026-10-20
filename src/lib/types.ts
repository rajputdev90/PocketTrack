export type TxType = "income" | "expense" | "transfer";
export type Tx = {
  id: string;
  categoryId?: string;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  category: string;
  paymentMethod?: string;
  notes?: string;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
};
export type Category = {
  id: string;
  name: string;
  appliesTo: TxType;
  userId?: string;
};
export type Source = {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  target?: number;
  notes?: string;
  archived: boolean;
};
export type SavingEvent = {
  id: string;
  sourceId: string;
  targetSourceId?: string;
  date: string;
  kind: "contribution" | "withdrawal" | "valuation" | "transfer";
  amount: number;
  notes?: string;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  targetDate?: string;
  priority: "low" | "medium" | "high";
  notes?: string;
  status: "active" | "paused" | "completed" | "archived";
  sourceId?: string;
  createdAt: string;
};
export type Budget = {
  id: string;
  month: string;
  total: number;
  categories: Record<string, number>;
};
export type FinanceData = {
  transactions: Tx[];
  sources: Source[];
  events: SavingEvent[];
  goals: Goal[];
  budgets: Budget[];
  categories: Category[];
  currency: string;
  theme: "light" | "dark";
};
export const CATEGORIES = [
  "Food",
  "Travel",
  "Education",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Subscriptions",
  "Salary",
  "Pocket money",
  "Gifts",
  "Other",
];
export const EMPTY_DATA: FinanceData = {
  transactions: [],
  sources: [],
  events: [],
  goals: [],
  budgets: [],
  categories: [],
  currency: "INR",
  theme: "light",
};
