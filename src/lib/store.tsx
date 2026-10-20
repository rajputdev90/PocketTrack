import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { supabase } from "./supabaseClient";
export { supabase } from "./supabaseClient";
import { EMPTY_DATA } from "./types";
import type {
  FinanceData,
  Tx,
  Source,
  SavingEvent,
  Goal,
  Budget,
  Category,
} from "./types";

const key = "pockettrack-data-v1";
type Store = {
  data: FinanceData;
  ready: boolean;
  error: string;
  addTx: (x: Tx) => Promise<void>;
  updateTx: (x: Tx) => Promise<void>;
  deleteTx: (id: string) => Promise<void>;
  setBudget: (x: Budget) => Promise<void>;
  saveCategory: (name: string, appliesTo: Tx["type"]) => Promise<Category>;
  saveSource: (x: Source) => Promise<void>;
  saveEvent: (x: SavingEvent) => Promise<void>;
  saveGoal: (x: Goal) => Promise<void>;
  setPref: (k: "theme" | "currency", v: string) => Promise<void>;
};
const C = createContext<Store | null>(null);

export function FinanceProvider({
  children,
}: {
  children: PropsWithChildren["children"];
}) {
  const [data, setData] = useState<FinanceData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    let activeUserId: string | null = null;
    const authSubscription = supabase?.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (event === "INITIAL_SESSION") {
        activeUserId = nextUserId;
        return;
      }
      if (nextUserId === activeUserId) return;
      activeUserId = nextUserId;
      if (live) {
        setData(EMPTY_DATA);
        setReady(false);
        setError(nextUserId ? "Session changed. Reloading securely…" : "Sign in to load your PocketTrack data.");
        window.location.reload();
      }
    });
    (async () => {
      if (!supabase) {
        try {
          const raw = localStorage.getItem(key);
          if (raw && live) setData({ ...EMPTY_DATA, ...JSON.parse(raw) });
        } catch {
          setError("Could not read saved browser data.");
        } finally {
          if (live) setReady(true);
        }
        return;
      }
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        if (live) {
          setError("Could not restore your Supabase session. Please sign in again.");
          setReady(true);
        }
        return;
      }
      if (!session) {
        if (live) {
          setError("Sign in to load your PocketTrack data.");
          setReady(true);
        }
        return;
      }
      const names = [
        "transactions",
        "savings_sources",
        "savings_events",
        "goals",
        "budgets",
      ] as const;
      const results = await Promise.all(
        names.map((name) =>
          supabase!.from(name).select("*").eq("user_id", session.user.id),
        ),
      );
      const { data: categoryBudgetRows, error: categoryBudgetError } =
        await supabase
          .from("category_budgets")
          .select("month, amount, category:categories(name)")
          .eq("user_id", session.user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("preferred_currency, theme")
        .eq("id", session.user.id)
        .maybeSingle();
      const { data: categoryRows, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, applies_to, user_id")
        .or(`user_id.is.null,user_id.eq.${session.user.id}`);
      if (!live) return;
      const failure = results.find((x) => x.error) ||
        (profileError ? { error: profileError } : undefined) ||
        (categoryBudgetError ? { error: categoryBudgetError } : undefined) ||
        (categoriesError ? { error: categoriesError } : undefined);
      if (failure) {
        setError(
          `Database setup needed: ${failure.error?.message || "Unable to load data"}`,
        );
        setReady(true);
        return;
      }
      if (!profile) {
        const { error: profileCreateError } = await supabase
          .from("profiles")
          .upsert({ id: session.user.id, preferred_currency: "INR", theme: "light" });
        if (profileCreateError) {
          setError("Could not initialize your profile preferences.");
          setReady(true);
          return;
        }
      }
      const [tx, src, events, goals, budgets] = results.map(
        (x) => x.data || [],
      );
      const normalizedCategoryBudgets = new Map<string, Record<string, number>>();
      for (const row of categoryBudgetRows || []) {
        const category = row.category as { name?: string } | null;
        if (!category?.name) continue;
        const current = normalizedCategoryBudgets.get(row.month) || {};
        current[category.name] = Number(row.amount);
        normalizedCategoryBudgets.set(row.month, current);
      }
      setData({
        ...EMPTY_DATA,
        currency: profile?.preferred_currency || "INR",
        theme: profile?.theme === "dark" ? "dark" : "light",
        transactions: tx.map((x: any) => ({
          id: x.id,
          categoryId: x.category_id || undefined,
          date: x.date,
          description: x.description,
          amount: Number(x.amount),
          type: x.type,
          category: x.category,
          paymentMethod: x.payment_method,
          notes: x.notes,
          sourceId: x.source_id,
          createdAt: x.created_at,
          updatedAt: x.updated_at,
        })),
        sources: src.map((x: any) => ({
          id: x.id,
          name: x.name,
          type: x.type,
          openingBalance: Number(x.opening_balance),
          target: x.target ? Number(x.target) : undefined,
          notes: x.notes,
          archived: x.archived,
        })),
        events: events.map((x: any) => ({
          id: x.id,
          sourceId: x.source_id,
          targetSourceId: x.target_source_id || undefined,
          date: x.date,
          kind: x.kind,
          amount: Number(x.amount),
          notes: x.notes,
        })),
        goals: goals.map((x: any) => ({
          id: x.id,
          name: x.name,
          target: Number(x.target),
          current: Number(x.current),
          targetDate: x.target_date,
          priority: x.priority,
          notes: x.notes,
          status: x.status,
          sourceId: x.source_id,
          createdAt: x.created_at,
        })),
        budgets: budgets.map((x: any) => ({
          id: x.id,
          month: x.month,
          total: Number(x.total),
          categories: {
            ...(x.categories || {}),
            ...(normalizedCategoryBudgets.get(x.month) || {}),
          },
        })),
        categories: (categoryRows || []).map((x: any) => ({
          id: x.id,
          name: x.name,
          appliesTo: x.applies_to,
          userId: x.user_id || undefined,
        })),
      });
      setReady(true);
    })();
    return () => {
      live = false;
      authSubscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ready && !supabase) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        setError("Browser storage is full; changes may not persist.");
      }
    }
  }, [data, ready]);

  const upsert = async (table: string, row: Record<string, unknown>) => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw Error("Please sign in again.");
    const { error: writeError } = await supabase
      .from(table)
      .upsert({ ...row, user_id: user.id });
    if (writeError) throw writeError;
  };
  const mutate = async <T extends { id: string }>(
    table: string,
    items: "transactions" | "sources" | "events" | "goals" | "budgets",
    row: T,
    mapper: (x: T) => Record<string, unknown>,
  ) => {
    await upsert(table, mapper(row));
    setData((p) => {
      const list = p[items] as unknown as T[];
      return {
        ...p,
        [items]: list.some((x) => x.id === row.id)
          ? list.map((x) => (x.id === row.id ? row : x))
          : [row, ...list],
      };
    });
  };

  const value = useMemo<Store>(
    () => ({
      data,
      ready,
      error,
      addTx: (x) =>
        mutate("transactions", "transactions", x, (r) => ({
          id: r.id,
          category_id: r.categoryId,
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          category: r.category,
          payment_method: r.paymentMethod,
          notes: r.notes,
          source_id: r.sourceId,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        })),
      updateTx: (x) =>
        mutate("transactions", "transactions", x, (r) => ({
          id: r.id,
          category_id: r.categoryId,
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          category: r.category,
          payment_method: r.paymentMethod,
          notes: r.notes,
          source_id: r.sourceId,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
        })),
      deleteTx: async (id) => {
        if (supabase) {
          const { error: e } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);
          if (e) throw e;
        }
        setData((p) => ({
          ...p,
          transactions: p.transactions.filter((x) => x.id !== id),
        }));
      },
      setBudget: async (x) => {
        if (supabase) {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();
          if (!user || authError) throw Error("Please sign in again.");
          const { data: categories, error: categoryError } = await supabase
            .from("categories")
            .select("id, name")
            .eq("applies_to", "expense")
            .or(`user_id.is.null,user_id.eq.${user.id}`);
          if (categoryError) throw categoryError;
          const categoryIds = new Map(
            (categories || []).map((category) => [category.name.toLowerCase(), category.id]),
          );
          const rows = Object.entries(x.categories)
            .map(([name, amount]) => ({
              user_id: user.id,
              month: x.month,
              category_id: categoryIds.get(name.toLowerCase()),
              amount,
            }))
            .filter((row): row is typeof row & { category_id: string } => !!row.category_id);
          const { error: saveError } = await supabase.rpc("replace_monthly_budget", {
            p_budget_id: x.id,
            p_month: x.month,
            p_total: x.total,
            p_categories: x.categories,
            p_category_budgets: rows.map(({ category_id, amount }) => ({
              category_id,
              amount,
            })),
          });
          if (saveError) throw saveError;
        }
        if (!supabase) {
          await upsert("budgets", {
            id: x.id,
            month: x.month,
            total: x.total,
            categories: x.categories,
          });
        }
        setData((p) => ({
          ...p,
          budgets: p.budgets.some((budget) => budget.id === x.id)
            ? p.budgets.map((budget) => (budget.id === x.id ? x : budget))
            : [x, ...p.budgets],
        }));
      },
      saveCategory: async (name, appliesTo) => {
        const cleanName = name.trim();
        if (!cleanName || cleanName.length > 60) {
          throw Error("Category names must be between 1 and 60 characters.");
        }
        const existing = data.categories.find(
          (category) =>
            category.appliesTo === appliesTo &&
            category.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase(),
        );
        if (existing) return existing;

        let category: Category;
        if (supabase) {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (!user || authError) throw Error("Please sign in again.");
          const { data: created, error: createError } = await supabase
            .from("categories")
            .insert({
              id: crypto.randomUUID(),
              user_id: user.id,
              name: cleanName,
              applies_to: appliesTo,
            })
            .select("id, name, applies_to, user_id")
            .single();
          if (createError || !created) {
            throw createError || Error("Could not create this category.");
          }
          category = {
            id: created.id,
            name: created.name,
            appliesTo: created.applies_to,
            userId: created.user_id,
          };
        } else {
          category = { id: crypto.randomUUID(), name: cleanName, appliesTo };
        }
        setData((previous) => ({
          ...previous,
          categories: [...previous.categories, category],
        }));
        return category;
      },
      saveSource: (x) =>
        mutate("savings_sources", "sources", x, (r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          opening_balance: r.openingBalance,
          target: r.target,
          notes: r.notes,
          archived: r.archived,
        })),
      saveEvent: (x) =>
        mutate("savings_events", "events", x, (r) => ({
          id: r.id,
          source_id: r.sourceId,
        target_source_id: r.targetSourceId,
          date: r.date,
          kind: r.kind,
          amount: r.amount,
          notes: r.notes,
        })),
      saveGoal: (x) =>
        mutate("goals", "goals", x, (r) => ({
          id: r.id,
          name: r.name,
          target: r.target,
          current: r.current,
          target_date: r.targetDate,
          priority: r.priority,
          notes: r.notes,
          status: r.status,
          source_id: r.sourceId,
        })),
      setPref: async (k, v) => {
        if (supabase) {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();
          if (!user || authError) {
            setError("Please sign in again before changing preferences.");
            return;
          }
          const next = {
            id: user.id,
            preferred_currency: k === "currency" ? v : data.currency,
            theme: k === "theme" ? v : data.theme,
          };
          const { error: saveError } = await supabase
            .from("profiles")
            .upsert(next);
          if (saveError) {
            setError("Could not save your preference. Please try again.");
            return;
          }
        }
        setError("");
        setData((p) => ({ ...p, [k]: v }));
      },
    }),
    [data, ready, error],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useFinance = () => {
  const v = useContext(C);
  if (!v) throw Error("FinanceProvider missing");
  return v;
};
