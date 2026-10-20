import React, { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  Ghost,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { supabase, useFinance } from "./lib/store";
import { supabaseConfigurationError } from "./lib/supabaseClient";
import { byCategory, money, monthKey, sourceBalance, totals } from "./lib/finance";
import { createMonthlyPdf } from "./lib/monthlyReport";
import { halloweenThemeExpiry, isHalloweenThemeActive } from "./lib/seasonalTheme";
import { CATEGORIES, type Tx } from "./lib/types";
const links = [
  ["Dashboard", "/", "LayoutDashboard"],
  ["Transactions", "/transactions", "ArrowLeftRight"],
  ["Spending", "/spending", "Activity"],
  ["Savings", "/savings", "Wallet"],
  ["Analytics", "/analytics", "BarChart3"],
  ["Goals", "/goals", "Target"],
  ["Budgets", "/budgets", "Coins"],
  ["AI Money Coach", "/coach", "Sparkles"],
  ["Settings", "/settings", "Settings"],
] as const;
const icons = {
  LayoutDashboard,
  ArrowLeftRight,
  Activity,
  Wallet,
  BarChart3,
  Target,
  Coins,
  Sparkles,
  Settings,
};
function BrandMark() {
  return (
    <div className="brand-mark" aria-label="PocketTrack">
      <img className="brand-mark-light" src="/pockettrack-mark.jpeg" alt="" />
      <img className="brand-mark-dark" src="/pockettrack-mark-dark.png" alt="" />
    </div>
  );
}
const isPasswordRecoveryUrl = () =>
  window.location.hash.includes("type=recovery") ||
  new URLSearchParams(window.location.search).get("type") === "recovery";
const HALLOWEEN_THEME_KEY = "pockettrack-halloween-until-v1";
const getHalloweenExpiry = () => {
  try {
    const stored = localStorage.getItem(HALLOWEEN_THEME_KEY);
    return isHalloweenThemeActive(stored) ? stored : null;
  } catch {
    return null;
  }
};
function App() {
  const { data, ready, error, setPref } = useFinance();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [collapsed, setCollapsed] = useState(false);
  const [quick, setQuick] = useState(false);
  const [budgetMonth, setBudgetMonth] = useState<string | null>(null);
  const [mobileMore, setMobileMore] = useState(false);
  const [halloweenUntil, setHalloweenUntil] = useState<string | null>(getHalloweenExpiry);
  const monthPicker = useRef<HTMLInputElement>(null);
  const halloweenActive = isHalloweenThemeActive(halloweenUntil);
  useEffect(() => {
    document.documentElement.dataset.theme = halloweenActive ? "halloween" : data.theme || "light";
  }, [data.theme, halloweenActive]);
  useEffect(() => {
    if (!halloweenUntil || halloweenActive) return;
    try { localStorage.removeItem(HALLOWEEN_THEME_KEY); } catch { /* storage may be unavailable */ }
    setHalloweenUntil(null);
  }, [halloweenUntil, halloweenActive]);
  useEffect(() => {
    if (!halloweenActive || !halloweenUntil) return;
    const timer = window.setInterval(() => {
      if (!isHalloweenThemeActive(halloweenUntil)) {
        try { localStorage.removeItem(HALLOWEEN_THEME_KEY); } catch { /* storage may be unavailable */ }
        setHalloweenUntil(null);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [halloweenActive, halloweenUntil]);
  const toggleHalloween = () => {
    if (halloweenActive) {
      try { localStorage.removeItem(HALLOWEEN_THEME_KEY); } catch { /* storage may be unavailable */ }
      setHalloweenUntil(null);
      return;
    }
    const expiry = halloweenThemeExpiry();
    try { localStorage.setItem(HALLOWEEN_THEME_KEY, expiry); } catch { /* theme still works until reload */ }
    setHalloweenUntil(expiry);
  };
  const loggedOut = !!supabase && error.includes("Sign in");
  if (supabase && isPasswordRecoveryUrl()) return <AuthScreen />;
  if (!ready)
    return (
      <div className="loading-screen">
        <BrandMark />
        <span>Getting your money in focus…</span>
      </div>
    );
  if (loggedOut) return <AuthScreen />;
  const selected = new Date(`${month}-01T12:00:00`);
  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside id="app-sidebar" className="sidebar">
        <div className="brand">
          <BrandMark />
          {!collapsed && (
            <div>
              <b>Pocket<span>Track</span></b>
              <small>STUDENT FINANCE</small>
            </div>
          )}
          <button
            className="icon-button collapse"
            aria-label="Collapse navigation"
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={17} />
          </button>
        </div>
        <div className="side-caption">WORKSPACE</div>
        <nav>
          {links.map(([title, path, icon]) => {
            const Icon = icons[icon];
            return (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                title={title}
              >
                <Icon size={18} />
                <span>{title}</span>
                {title === "AI Money Coach" && !collapsed && (
                  <span className="new-tag">NEW</span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="side-footer">
          <div className="avatar">S</div>
          {!collapsed && (
            <div className="user-label">
              <b>Student account</b>
              <small>{supabase ? "Synced securely" : "Local workspace"}</small>
            </div>
          )}
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          {collapsed && (
            <button
              className="icon-button sidebar-expand"
              aria-label="Show sidebar"
              aria-expanded="false"
              aria-controls="app-sidebar"
              title="Show sidebar"
              onClick={() => setCollapsed(false)}
            >
              <Menu size={19} />
            </button>
          )}
          {halloweenActive && <span className="halloween-active-label"><Ghost size={14} /> Spooky season</span>}
          <div className="mobile-brand">
            <BrandMark />
            <b>Pocket<span>Track</span></b>
          </div>
          <div className="topbar-right">
            <div className="month-control">
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => setMonth(monthKey(subMonths(selected, 1)))}
              >
                <ChevronLeft size={16} />
              </button>
              <span>{format(selected, "MMMM yyyy")}</span>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => setMonth(monthKey(addMonths(selected, 1)))}
              >
                <ChevronRight size={16} />
              </button>
              <button
                className="icon-button month-calendar-trigger"
                aria-label="Choose month from calendar"
                title="Choose month"
                onClick={() => {
                  const input = monthPicker.current as (HTMLInputElement & { showPicker?: () => void }) | null;
                  if (input?.showPicker) input.showPicker();
                  else input?.click();
                }}
              >
                <CalendarDays size={16} />
              </button>
              <input
                ref={monthPicker}
                className="month-picker-input"
                type="month"
                aria-label="Choose month and year"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                tabIndex={-1}
              />
            </div>
            <button
              className="icon-button theme-toggle"
              aria-label={halloweenActive ? "Turn off Halloween theme" : "Toggle light and dark mode"}
              title={halloweenActive ? "Turn off Halloween theme" : "Toggle theme"}
              onClick={() =>
                halloweenActive
                  ? toggleHalloween()
                  : setPref("theme", data.theme === "dark" ? "light" : "dark")
              }
            >
              {halloweenActive ? <Ghost size={17} /> : data.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              aria-label="Add transaction"
              className="button button-primary top-add"
              onClick={() => setQuick(true)}
            >
              <Plus size={17} />
              <span className="top-add-label">Add transaction</span>
            </button>
          </div>
        </header>
        <div className="page-wrap">
          {error && !loggedOut && (
            <div className="setup-banner" role="status">
              {error}
            </div>
          )}
          <Routes>
            <Route
              path="/"
              element={<Dashboard month={month} onMonth={setMonth} onBudget={() => setBudgetMonth(month)} />}
            />
            <Route
              path="/transactions"
              element={<Transactions month={month} onMonth={setMonth} />}
            />
            <Route path="/spending" element={<Spending month={month} />} />
            <Route path="/savings" element={<Savings month={month} />} />
            <Route path="/analytics" element={<Analytics month={month} />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/budgets" element={<Budgets month={month} />} />
            <Route path="/coach" element={<Coach month={month} />} />
            <Route path="/settings" element={<SettingsPage halloweenActive={halloweenActive} halloweenUntil={halloweenUntil} onToggleHalloween={toggleHalloween} />} />
            <Route
              path="*"
              element={<Dashboard month={month} onMonth={setMonth} onBudget={() => setBudgetMonth(month)} />}
            />
          </Routes>
        </div>
        <nav className="mobile-nav">
          {links.slice(0, 4).map(([t, p, i]) => {
            const Icon = icons[i];
            return (
              <NavLink key={p} to={p} end={p === "/"}>
                <Icon size={19} />
                <span>{t === "Transactions" ? "Activity" : t}</span>
              </NavLink>
            );
          })}
          <button
            className={mobileMore ? "more-active" : ""}
            onClick={() => setMobileMore(!mobileMore)}
          >
            <Menu size={19} />
            <span>More</span>
          </button>
        </nav>
        {mobileMore && (
          <div className="mobile-more-menu">
            {links.slice(4).map(([t, p, i]) => {
              const Icon = icons[i];
              return (
                <NavLink key={p} to={p} onClick={() => setMobileMore(false)}>
                  <Icon size={17} />
                  {t}
                </NavLink>
              );
            })}
          </div>
        )}
      </main>
      {quick && <TransactionModal onClose={() => setQuick(false)} />}
      {budgetMonth && <BudgetQuickModal month={budgetMonth} onClose={() => setBudgetMonth(null)} />}
    </div>
  );
}
function PageHead({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children}
    </div>
  );
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
function Empty({
  title = "Nothing here yet",
  text = "Add a record to see your finances take shape.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Activity size={20} />
      </div>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const className = `card stat ${accent ? "accent-stat" : ""} ${onClick ? "stat-action" : ""}`;
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <div className="stat-top">
          <span>{label}</span>
          <div className="stat-icon">{icon}</div>
        </div>
        <strong>{value}</strong>
        <small>{sub}</small>
      </button>
    );
  }
  return (
    <Card className={className}>
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </Card>
  );
}
function Dashboard({
  month,
  onMonth,
  onBudget,
}: {
  month: string;
  onMonth: (x: string) => void;
  onBudget: () => void;
}) {
  const { data } = useFinance();
  const t = totals(data, month),
    cats = byCategory(t.transactions),
    recent = [...t.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  const bud = data.budgets.find((x) => x.month === month);
  const [exporting, setExporting] = useState(false);
  return (
    <>
      <PageHead
        eyebrow="YOUR MONEY, IN FOCUS"
        title="Good money habits start here."
        sub="A clear picture of where you stand this month."
      >
        <button
          className="button button-outline"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await exportPdf(data, month);
            } catch {
              alert("Could not generate your report. Please try again.");
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download size={16} />
          {exporting ? "Preparing…" : "Download monthly PDF"}
        </button>
      </PageHead>
      <div className="stat-grid">
        <Stat
          label="This Month Budget"
          value={
            t.budget === undefined
              ? "Set up budget"
              : money(t.budget, data.currency)
          }
          icon={<Wallet size={17} />}
          sub={
            t.budget === undefined
              ? "Click to set this month’s budget"
              : "Click to edit monthly limit"
          }
          accent
          onClick={onBudget}
        />
        <Stat
          label="Spent This Month"
          value={money(t.spent, data.currency)}
          icon={<ArrowUpRight size={17} />}
          sub="Expenses, excluding transfers"
        />
        <Stat
          label="Remaining Budget"
          value={
            t.remaining === undefined ? "—" : money(t.remaining, data.currency)
          }
          icon={<ArrowDownLeft size={17} />}
          sub={
            t.remaining === undefined
              ? "Set a budget to track this"
              : "Budget less qualifying expenses"
          }
        />
        <Stat
          label="Total Savings"
          value={money(t.savings, data.currency)}
          icon={<Coins size={17} />}
          sub="Across active tracked sources"
        />
      </div>
      <div className="dashboard-grid">
        <Card className="budget-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">MONTHLY PLAN</span>
              <h2>Budget progress</h2>
            </div>
            <select
              aria-label="Select month"
              value={month}
              onChange={(e) => onMonth(e.target.value)}
            >
              <MonthOptions />
            </select>
          </div>
          {t.budget === undefined ? (
            <Empty
              title="Your budget starts here"
              text="Set a monthly amount to see how spending compares."
            />
          ) : (
            <>
              <div className="budget-numbers">
                <div>
                  <strong>{money(t.spent, data.currency)}</strong>
                  <span>spent</span>
                </div>
                <div className="right-number">
                  <strong>
                    {money(Math.abs(t.remaining || 0), data.currency)}
                  </strong>
                  <span>{(t.remaining || 0) < 0 ? "over budget" : "left"}</span>
                </div>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${(t.remaining || 0) < 0 ? "over" : ""}`}
                  style={{
                    width: `${Math.min(100, (t.spent / (t.budget || 1)) * 100)}%`,
                  }}
                />
              </div>
              <div className="progress-foot">
                <span>
                  {Math.round((t.spent / (t.budget || 1)) * 100)}% used
                </span>
                <span>{money(t.budget, data.currency)} total</span>
              </div>
              {Object.entries(bud?.categories || {}).length > 0 && (
                <div className="category-budget-list">
                  {Object.entries(bud?.categories || {})
                    .slice(0, 3)
                    .map(([c, v]) => (
                      <div key={c}>
                        <span>{c}</span>
                        <b>
                          {money(
                            cats.find((x) => x.name === c)?.value || 0,
                            data.currency,
                          )}{" "}
                          / {money(v, data.currency)}
                        </b>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </Card>
        <Card className="category-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">WHERE IT GOES</span>
              <h2>Spending by category</h2>
            </div>
          </div>
          {cats.length ? (
            <>
              <div className="category-bars">
                {cats.slice(0, 5).map((c, i) => (
                  <div className="category-row" key={c.name}>
                    <div className="cat-label">
                      <span className={`cat-dot dot-${i % 5}`} />
                      <span>{c.name}</span>
                      <b>{money(c.value, data.currency)}</b>
                    </div>
                    <div className="mini-track">
                      <i
                        style={{
                          width: `${(c.value / Math.max(1, cats[0].value)) * 100}%`,
                        }}
                        className={`dot-${i % 5}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="No spending to show"
              text="Expenses will appear here once recorded."
            />
          )}
        </Card>
        <Card className="recent-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">LATEST ACTIVITY</span>
              <h2>Recent transactions</h2>
            </div>
            <NavLink to="/transactions" className="text-link">
              View all <ChevronRight size={14} />
            </NavLink>
          </div>
          {recent.length ? (
            <div className="tx-list">
              {recent.map((x) => (
                <TxRow key={x.id} tx={x} currency={data.currency} />
              ))}
            </div>
          ) : (
            <Empty
              title="A fresh start"
              text="Your transactions will show here once you add one."
            />
          )}
        </Card>
        <Card className="insight-card">
          <div className="insight-decoration">
            <Sparkles size={18} />
          </div>
          <span className="eyebrow">A QUICK OBSERVATION</span>
          <h2>
            {cats.length
              ? `${cats[0].name} is your top category`
              : "Small steps add up."}
          </h2>
          <p>
            {cats.length
              ? `${cats[0].name} makes up ${Math.round((cats[0].value / Math.max(1, t.spent)) * 100)}% of your recorded spending this month.`
              : "Add a few transactions to unlock useful, data-based spending insights."}
          </p>
          <NavLink className="text-link" to="/coach">
            Explore your insights <ChevronRight size={14} />
          </NavLink>
        </Card>
      </div>
    </>
  );
}
function MonthOptions() {
  const now = new Date();
  return (
    <>
      {Array.from({ length: 18 }, (_, i) => {
        const d = subMonths(now, i);
        const value = monthKey(d);
        return (
          <option key={value} value={value}>
            {format(d, "MMMM yyyy")}
          </option>
        );
      })}
    </>
  );
}
function TxRow({ tx, currency }: { tx: Tx; currency: string }) {
  return (
    <div className="tx-row">
      <div className={`tx-symbol ${tx.type}`}>
        {tx.type === "income" ? (
          <ArrowDownLeft size={17} />
        ) : tx.type === "transfer" ? (
          <ArrowLeftRight size={17} />
        ) : (
          <ArrowUpRight size={17} />
        )}
      </div>
      <div className="tx-main">
        <b>{tx.description}</b>
        <span>
          {tx.category} ·{" "}
          {new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
          }).format(new Date(`${tx.date}T12:00:00`))}
        </span>
      </div>
      <strong className={tx.type === "income" ? "positive" : ""}>
        {tx.type === "income" ? "+" : "−"}
        {money(tx.amount, currency)}
      </strong>
    </div>
  );
}
function TransactionModal({
  onClose,
  edit,
}: {
  onClose: () => void;
  edit?: Tx;
}) {
  const { data, addTx, updateTx, saveCategory } = useFinance();
  const [busy, setBusy] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    description: edit?.description || "",
    amount: edit?.amount.toString() || "",
    date: edit?.date || format(new Date(), "yyyy-MM-dd"),
    type: edit?.type || "expense",
    isUnplanned: edit?.isUnplanned ?? false,
    category: edit?.category || "Food",
    paymentMethod: edit?.paymentMethod || "",
    notes: edit?.notes || "",
  });
  const defaultsFor = (type: Tx["type"]) =>
    type === "income"
      ? ["Salary", "Pocket money", "Gifts", "Other"]
      : type === "transfer"
        ? ["Transfer"]
        : CATEGORIES.filter((name) => !["Salary", "Pocket money"].includes(name));
  const namesFor = (type: Tx["type"]) =>
    [...new Set([
      ...data.categories.filter((category) => category.appliesTo === type).map((category) => category.name),
      ...defaultsFor(type),
    ])];
  const categoryNames = namesFor(form.type as Tx["type"]);
  const isCustomCategory = !!form.category.trim() && !categoryNames.some(
    (name) => name.toLocaleLowerCase() === form.category.trim().toLocaleLowerCase(),
  );
  const change = (key: string, value: string) => {
    if (key === "type") {
      const nextType = value as Tx["type"];
      setForm((previous) => {
        const options = namesFor(nextType);
        const category = options.find((name) => name.toLocaleLowerCase() === previous.category.toLocaleLowerCase()) || options[0] || "";
        return { ...previous, type: nextType, category, isUnplanned: nextType === "expense" ? previous.isUnplanned : false };
      });
      setCategoryMessage("");
      return;
    }
    setForm((previous) => ({ ...previous, [key]: value }));
    if (key === "category") setCategoryMessage("");
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">TRANSACTION</span>
            <h2 id="tx-modal-title">
              {edit ? "Edit transaction" : "Add transaction"}
            </h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            const amount = Number(form.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
              setErr("Enter an amount greater than zero.");
              return;
            }
            const categoryName = form.category.trim();
            if (!categoryName || categoryName.length > 60) {
              setErr("Enter a category name between 1 and 60 characters.");
              return;
            }
            setBusy(true);
            const now = new Date().toISOString();
            try {
              const type = form.type as Tx["type"];
              const existingCategory = data.categories.find(
                (category) => category.appliesTo === type && category.name.toLocaleLowerCase() === categoryName.toLocaleLowerCase(),
              );
              const isBuiltIn = defaultsFor(type).some((name) => name.toLocaleLowerCase() === categoryName.toLocaleLowerCase());
              const category = existingCategory || (!isBuiltIn ? await saveCategory(categoryName, type) : undefined);
              const row: Tx = {
                id: edit?.id || crypto.randomUUID(),
                categoryId: category?.id,
                date: form.date,
                description: form.description.trim(),
                amount,
                category: category?.name || categoryName,
                type,
                isUnplanned: type === "expense" && form.isUnplanned,
                paymentMethod: form.paymentMethod,
                notes: form.notes,
                createdAt: edit?.createdAt || now,
                updatedAt: now,
              };
              edit ? await updateTx(row) : await addTx(row);
              onClose();
            } catch (e) {
              setErr(
                e instanceof Error
                  ? e.message
                  : "Could not save this transaction.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Description
            <input
              required
              maxLength={120}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              placeholder="e.g. Lunch at campus"
            />
          </label>
          <div className="form-row">
            <label>
              Amount
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(e) => change("amount", e.target.value)}
                placeholder="0.00"
              />
            </label>
            <label>
              Date
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => change("date", e.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Type
              <select
                value={form.type}
                onChange={(e) => change("type", e.target.value)}
              >
                <option value="expense">Expense</option>
                {edit?.type === "income" && <option value="income">Money received (existing)</option>}
                <option value="transfer">Transfer</option>
              </select>
            </label>
            <label>
              Category
              <input
                required
                maxLength={60}
                list="transaction-category-options"
                autoComplete="off"
                value={form.category}
                onChange={(e) => change("category", e.target.value)}
                placeholder="Choose or type a category"
              />
              <datalist id="transaction-category-options">
                {categoryNames.map((name) => <option key={name} value={name} />)}
              </datalist>
              {isCustomCategory && (
                <button
                  type="button"
                  className="category-add-button"
                  disabled={categoryBusy}
                  onClick={async () => {
                    setCategoryBusy(true);
                    setCategoryMessage("");
                    try {
                      const saved = await saveCategory(form.category, form.type as Tx["type"]);
                      setForm((previous) => ({ ...previous, category: saved.name }));
                      setCategoryMessage(`“${saved.name}” is ready for future transactions.`);
                    } catch (cause) {
                      setErr(cause instanceof Error ? cause.message : "Could not save this category.");
                    } finally {
                      setCategoryBusy(false);
                    }
                  }}
                >
                  <Plus size={13} /> {categoryBusy ? "Adding…" : `Add “${form.category.trim()}” to categories`}
                </button>
              )}
              {categoryMessage && <span className="category-saved-note" role="status">{categoryMessage}</span>}
            </label>
          </div>
          {form.type === "expense" && (
            <div className="unplanned-field">
              <label className="unplanned-toggle">
                <input
                  type="checkbox"
                  checked={form.isUnplanned}
                  onChange={(e) => setForm((previous) => ({ ...previous, isUnplanned: e.target.checked }))}
                />
                <span>Mark as extra / unplanned</span>
              </label>
              <small>Still included in total spending and budget usage.</small>
            </div>
          )}
          <label>
            Payment method <span className="optional">Optional</span>
            <input
              value={form.paymentMethod}
              onChange={(e) => change("paymentMethod", e.target.value)}
              placeholder="UPI, cash, card…"
            />
          </label>
          <label>
            Notes <span className="optional">Optional</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => change("notes", e.target.value)}
              placeholder="Add a note"
            />
          </label>
          {err && <div className="form-error">{err}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button disabled={busy} className="button button-primary">
              {busy ? "Saving…" : edit ? "Save changes" : "Save transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Transactions({
  month,
  onMonth,
}: {
  month: string;
  onMonth: (x: string) => void;
}) {
  const { data, deleteTx } = useFinance();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [expensePlan, setExpensePlan] = useState("all");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [edit, setEdit] = useState<Tx | undefined>();
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState<Tx | undefined>();
  const [exporting, setExporting] = useState(false);
  const [limit, setLimit] = useState(50);
  const t = totals(data, month);
  const availableCategories = [...new Set([
    ...data.categories.map((item) => item.name),
    ...data.transactions.map((item) => item.category),
    ...CATEGORIES,
  ])].sort((a, b) => a.localeCompare(b));
  const rows = t.transactions
    .filter(
      (x) =>
        (!query ||
          `${x.description} ${x.notes || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (type === "all" || x.type === type) &&
        (category === "all" || x.category === category) &&
        (expensePlan === "all" || (x.type === "expense" && (expensePlan === "extra" ? x.isUnplanned : !x.isUnplanned))),
    )
    .sort((a, b) =>
      sort === "date" ? b.date.localeCompare(a.date) : b.amount - a.amount,
    );
  return (
    <>
      <PageHead
        eyebrow="YOUR ACTIVITY"
        title="Transactions"
        sub="Keep every rupee accounted for, your way."
      >
        <button
          className="button button-outline"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await exportPdf(data, month);
            } catch {
              alert("Could not generate your report.");
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download size={16} />
          {exporting ? "Preparing…" : "Download monthly PDF"}
        </button>
        <button className="button button-primary" onClick={() => setAdd(true)}>
          <Plus size={17} />
          <span className="top-add-label">Add transaction</span>
        </button>
      </PageHead>
      <div className="stat-grid compact-stats extra-expense-stats">
        <Stat
          label="Expenses"
          value={money(t.spent, data.currency)}
          icon={<ArrowUpRight size={17} />}
          sub="Qualifying spending"
        />
        <Stat
          label="Extra / unplanned"
          value={money(t.extraSpent, data.currency)}
          icon={<ArrowUpRight size={17} />}
          sub="Included in total spending"
          accent
        />
        <Stat
          label="Budget left"
          value={t.budget === undefined ? "Not set" : money(t.budget - t.spent, data.currency)}
          icon={<Coins size={17} />}
          sub={t.budget === undefined ? "Set this month’s budget" : "Budget minus expenses"}
          accent
        />
        <Stat
          label="Transactions"
          value={String(t.transactions.length)}
          icon={<Activity size={17} />}
          sub="All activity this month"
        />
      </div>
      <Card className="transactions-card">
        <div className="filters">
          <div className="search-box">
            <Activity size={16} />
            <input
              aria-label="Search transactions"
              placeholder="Search description or notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Month"
            value={month}
            onChange={(e) => onMonth(e.target.value)}
          >
            <MonthOptions />
          </select>
          <select
            aria-label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="expense">Expenses</option>
            <option value="transfer">Transfers</option>
          </select>
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {availableCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Expense plan status"
            value={expensePlan}
            onChange={(e) => setExpensePlan(e.target.value)}
          >
            <option value="all">All expense plans</option>
            <option value="planned">Planned expenses</option>
            <option value="extra">Extra / unplanned</option>
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as "date" | "amount")}
          >
            <option value="date">Newest first</option>
            <option value="amount">Largest amount</option>
          </select>
        </div>
        {rows.length ? (
          <>
            {" "}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DESCRIPTION</th>
                    <th>DATE</th>
                    <th>CATEGORY</th>
                    <th>TYPE</th>
                    <th className="align-right">AMOUNT</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, limit).map((x) => (
                    <tr key={x.id}>
                      <td>
                        <button
                          className="table-link"
                          onClick={() => setSelected(x)}
                        >
                          {x.description}
                        </button>
                        {x.notes && <small>{x.notes}</small>}
                      </td>
                      <td>
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        }).format(new Date(`${x.date}T12:00:00`))}
                      </td>
                      <td>
                        <span className="pill">{x.category}</span>
                      </td>
                      <td>
                        <span className={`type-pill ${x.type}`}>{x.type === "income" ? "Money received" : x.type}</span>
                        {x.type === "expense" && x.isUnplanned && <span className="unplanned-badge">Extra</span>}
                      </td>
                      <td
                        className={`amount ${x.type === "income" ? "positive" : ""}`}
                      >
                        {x.type === "income"
                          ? "+"
                          : x.type === "expense"
                            ? "−"
                            : ""}
                        {money(x.amount, data.currency)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            aria-label={`Edit ${x.description}`}
                            className="text-link"
                            onClick={() => setEdit(x)}
                          >
                            Edit
                          </button>
                          <button
                            aria-label={`Delete ${x.description}`}
                            className="text-link danger"
                            onClick={async () => {
                              if (
                                confirm(
                                  `Delete “${x.description}”? This cannot be undone.`,
                                )
                              )
                                await deleteTx(x.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > limit && (
              <button
                className="button button-outline load-more"
                onClick={() => setLimit((n) => n + 50)}
              >
                Show more transactions
              </button>
            )}
          </>
        ) : (
          <Empty
            title={
              query || type !== "all" || category !== "all" || expensePlan !== "all"
                ? "No matching transactions"
                : "No transactions this month"
            }
            text="Try adjusting filters or add your first transaction."
          />
        )}
      </Card>
      {(add || edit) && (
        <TransactionModal
          edit={edit}
          onClose={() => {
            setAdd(false);
            setEdit(undefined);
          }}
        />
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(undefined)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>{selected.description}</h2>
              <button
                className="icon-button"
                onClick={() => setSelected(undefined)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="detail-grid">
              <span>Date</span>
              <b>{selected.date}</b>
              <span>Amount</span>
              <b>{money(selected.amount, data.currency)}</b>
              <span>Type</span>
              <b>{selected.type === "income" ? "Money received" : selected.type}</b>
              <span>Category</span>
              <b>{selected.category}</b>
              {selected.type === "expense" && (
                <>
                  <span>Budget status</span>
                  <b>{selected.isUnplanned ? "Extra / unplanned" : "Planned expense"}</b>
                </>
              )}
              <span>Payment</span>
              <b>{selected.paymentMethod || "—"}</b>
              <span>Notes</span>
              <b>{selected.notes || "—"}</b>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function Spending({ month }: { month: string }) {
  const { data } = useFinance();
  const t = totals(data, month),
    cats = byCategory(t.transactions),
    past = totals(
      data,
      monthKey(subMonths(new Date(`${month}-01T12:00:00`), 1)),
    );
  return (
    <>
      <PageHead
        eyebrow="SPENDING PATTERNS"
        title="Spending"
        sub="See the habits behind the numbers."
      />
      <div className="stat-grid compact-stats extra-expense-stats">
        <Stat
          label="Spent this month"
          value={money(t.spent, data.currency)}
          icon={<ArrowUpRight size={17} />}
          sub="Qualifying expenses"
        />
        <Stat
          label="Extra / unplanned"
          value={money(t.extraSpent, data.currency)}
          icon={<ArrowUpRight size={17} />}
          sub="Part of total spending"
          accent
        />
        <Stat
          label="Transactions"
          value={String(
            t.transactions.filter((x) => x.type === "expense").length,
          )}
          icon={<Activity size={17} />}
          sub="Expense records"
        />
        <Stat
          label="vs. last month"
          value={
            past.spent
              ? `${t.spent > past.spent ? "+" : "−"}${money(Math.abs(t.spent - past.spent), data.currency)}`
              : "—"
          }
          icon={<BarChart3 size={17} />}
          sub={
            past.spent ? "Compared with prior month" : "No prior month activity"
          }
          accent
        />
      </div>
      <div className="two-col">
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">MONTHLY BREAKDOWN</span>
              <h2>Spending by category</h2>
            </div>
          </div>
          {cats.length ? (
            cats.map((c, i) => (
              <div className="category-row spacious" key={c.name}>
                <div className="cat-label">
                  <span className={`cat-dot dot-${i % 5}`} />
                  <span>{c.name}</span>
                  <b>
                    {money(c.value, data.currency)}{" "}
                    <small>
                      {Math.round((c.value / Math.max(1, t.spent)) * 100)}%
                    </small>
                  </b>
                </div>
                <div className="mini-track">
                  <i
                    className={`dot-${i % 5}`}
                    style={{
                      width: `${(c.value / Math.max(1, t.spent)) * 100}%`,
                    }}
                  />
                </div>
                <div className="muted-line">
                  {t.budget &&
                  data.budgets.find((b) => b.month === month)?.categories[
                    c.name
                  ]
                    ? `${Math.round((c.value / data.budgets.find((b) => b.month === month)!.categories[c.name]) * 100)}% of category budget used`
                    : "No category budget set"}
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="No expenses recorded"
              text="Once you record expenses, your breakdown will appear here."
            />
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">BIGGEST ITEMS</span>
              <h2>Largest transactions</h2>
            </div>
          </div>
          {t.transactions
            .filter((x) => x.type === "expense")
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6)
            .map((x) => (
              <TxRow key={x.id} tx={x} currency={data.currency} />
            ))}
          {!cats.length && <Empty />}
        </Card>
      </div>
    </>
  );
}
function BudgetQuickModal({ month, onClose }: { month: string; onClose: () => void }) {
  const { data, setBudget } = useFinance();
  const existing = data.budgets.find((budget) => budget.month === month);
  const [amount, setAmount] = useState(existing ? String(existing.total) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal budget-quick-modal" role="dialog" aria-modal="true" aria-labelledby="quick-budget-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">MONTHLY PLAN</span>
            <h2 id="quick-budget-title">{existing ? "Edit monthly budget" : "Set monthly budget"}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="muted quick-budget-month">{format(new Date(`${month}-01T12:00:00`), "MMMM yyyy")} · category limits will be kept as they are.</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const total = Number(amount);
          if (!Number.isFinite(total) || total < 0) {
            setError("Enter a valid budget amount of zero or more.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await setBudget({
              id: existing?.id || crypto.randomUUID(),
              month,
              total,
              categories: existing?.categories || {},
            });
            onClose();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not save this budget. Please try again.");
          } finally {
            setBusy(false);
          }
        }}>
          <label>
            Total budget
            <div className="currency-input">
              <span>{data.currency === "INR" ? "₹" : data.currency}</span>
              <input autoFocus required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save budget"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Budgets({ month }: { month: string }) {
  const { data, setBudget } = useFinance();
  const existing = data.budgets.find((x) => x.month === month);
  const [total, setTotal] = useState(existing?.total.toString() || "");
  const [cats, setCats] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(existing?.categories || {}).map(([k, v]) => [
        k,
        String(v),
      ]),
    ),
  );
  useEffect(() => {
    setTotal(existing?.total.toString() || "");
    setCats(
      Object.fromEntries(
        Object.entries(existing?.categories || {}).map(([k, v]) => [
          k,
          String(v),
        ]),
      ),
    );
  }, [month]);
  const t = totals(data, month),
    spend = byCategory(t.transactions);
  const budgetCategories = [...new Set([
    ...CATEGORIES.filter((name) => !["Salary", "Pocket money", "Gifts"].includes(name)),
    ...data.categories.filter((category) => category.appliesTo === "expense").map((category) => category.name),
  ])];
  return (
    <>
      <PageHead
        eyebrow="PLAN WITH PURPOSE"
        title="Budgets"
        sub="Build a monthly plan that gives your money direction."
      />
      <div className="two-col">
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">OVERALL LIMIT</span>
              <h2>Monthly budget</h2>
            </div>
            <span className="pill">{month}</span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const n = Number(total);
              if (n < 0) return;
              await setBudget({
                id: existing?.id || crypto.randomUUID(),
                month,
                total: n,
                categories: Object.fromEntries(
                  Object.entries(cats)
                    .filter(([, v]) => Number(v) > 0)
                    .map(([k, v]) => [k, Number(v)]),
                ),
              });
            }}
          >
            <label>
              Amount for{" "}
              {new Intl.DateTimeFormat("en-IN", {
                month: "long",
                year: "numeric",
              }).format(new Date(`${month}-01T12:00:00`))}
              <div className="currency-input">
                <span>₹</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="0"
                />
              </div>
            </label>
            <div className="modal-actions">
              <button className="button button-primary">Save budget</button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  const prev = data.budgets.find(
                    (x) =>
                      x.month ===
                      monthKey(subMonths(new Date(`${month}-01T12:00:00`), 1)),
                  );
                  if (prev) {
                    setTotal(String(prev.total));
                    setCats(
                      Object.fromEntries(
                        Object.entries(prev.categories).map(([k, v]) => [
                          k,
                          String(v),
                        ]),
                      ),
                    );
                  }
                }}
              >
                Copy previous month
              </button>
            </div>
          </form>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">CATEGORY LIMITS</span>
              <h2>Budget by category</h2>
            </div>
          </div>
          <p className="muted">
            Optional caps help you spot the categories to watch.
          </p>
          <div className="budget-input-list">
            {budgetCategories.map((c) => (
              <label key={c}>
                <span>{c}</span>
                <div className="currency-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="No limit"
                    value={cats[c] || ""}
                    onChange={(e) => setCats({ ...cats, [c]: e.target.value })}
                  />
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>
      <Card className="activity-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">ACTUAL VS PLAN</span>
            <h2>Budget performance</h2>
          </div>
        </div>
        {existing ? (
          Object.entries(existing.categories).length ? (
            Object.entries(existing.categories).map(([c, v]) => {
              const actual = spend.find((x) => x.name === c)?.value || 0;
              return (
                <BudgetLine
                  key={c}
                  name={c}
                  actual={actual}
                  limit={v}
                  currency={data.currency}
                />
              );
            })
          ) : (
            <Empty
              title="No category limits yet"
              text="Add category amounts above, then save your budget."
            />
          )
        ) : (
          <Empty
            title="No budget configured for this month"
            text="Set an overall budget to start tracking progress."
          />
        )}
      </Card>
    </>
  );
}
function BudgetLine({
  name,
  actual,
  limit,
  currency,
}: {
  name: string;
  actual: number;
  limit: number;
  currency: string;
}) {
  return (
    <div className="budget-line">
      <div>
        <b>{name}</b>
        <span>
          {money(actual, currency)} of {money(limit, currency)}
        </span>
      </div>
      <div className="progress-track">
        <i
          className={`progress-fill ${actual > limit ? "over" : ""}`}
          style={{
            width: `${Math.min(100, (actual / Math.max(limit, 1)) * 100)}%`,
          }}
        />
      </div>
      <small className={actual > limit ? "danger" : ""}>
        {actual > limit
          ? `${money(actual - limit, currency)} over`
          : money(limit - actual, currency) + " left"}
      </small>
    </div>
  );
}
function Savings({ month }: { month: string }) {
  const { data, saveSource, saveEvent } = useFinance();
  const [show, setShow] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferError, setTransferError] = useState("");
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("0");
  const [type, setType] = useState("Savings Account");
  const list = data.sources.filter((s) => !s.archived);
  const t = totals(data, month);
  return (
    <>
      <PageHead
        eyebrow="BUILD YOUR BUFFER"
        title="Savings"
        sub="Track balances and the small steps that grow them."
      >
        <button className="button button-primary" onClick={() => setShow(true)}>
          <Plus size={16} /> Add source
        </button>
      </PageHead>
      <div className="stat-grid compact-stats">
        <Stat
          label="Total tracked value"
          value={money(t.savings, data.currency)}
          icon={<Coins size={17} />}
          sub="Active savings sources"
        />
        <Stat
          label="Contributions"
          value={money(t.contributions, data.currency)}
          icon={<ArrowDownLeft size={17} />}
          sub="This month · separate from income"
        />
        <Stat
          label="Withdrawals"
          value={money(t.withdrawals, data.currency)}
          icon={<ArrowUpRight size={17} />}
          sub="This month · separate from spending"
        />
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <span className="eyebrow">YOUR SAVINGS SOURCES</span>
            <h2>Accounts & holdings</h2>
          </div>
        </div>
        {list.length ? (
          <div className="source-grid">
            {list.map((s) => {
              const balance = sourceBalance(data, s.id);
              return (
                <div className="source-card" key={s.id}>
                  <div className="source-icon">
                    <Wallet size={18} />
                  </div>
                  <span className="source-type">{s.type}</span>
                  <h3>{s.name}</h3>
                  <strong>{money(balance, data.currency)}</strong>
                  <div className="source-actions">
                    <button
                      className="text-link"
                      onClick={async () => {
                        const edited = prompt("Source name", s.name);
                        if (edited?.trim())
                          await saveSource({ ...s, name: edited.trim() });
                      }}
                    >
                      Edit source
                    </button>
                    <button
                      className="text-link"
                      onClick={async () => {
                        const n = Number(prompt("Contribution amount (₹)"));
                        if (n > 0)
                          await saveEvent({
                            id: crypto.randomUUID(),
                            sourceId: s.id,
                            date: format(new Date(), "yyyy-MM-dd"),
                            kind: "contribution",
                            amount: n,
                          });
                      }}
                    >
                      + Contribute
                    </button>
                    <button
                      className="text-link"
                      onClick={async () => {
                        const n = Number(prompt("Withdrawal amount (₹)"));
                        if (n > 0 && n <= balance)
                          await saveEvent({
                            id: crypto.randomUUID(),
                            sourceId: s.id,
                            date: format(new Date(), "yyyy-MM-dd"),
                            kind: "withdrawal",
                            amount: n,
                          });
                      }}
                    >
                      Withdraw
                    </button>
                    {list.length > 1 && (
                      <button
                        className="text-link"
                        onClick={() => {
                          setTransferFrom(s.id);
                          setTransferTarget(list.find((target) => target.id !== s.id)?.id || "");
                          setTransferAmount("");
                          setTransferError("");
                        }}
                      >
                        Transfer
                      </button>
                    )}
                    <button
                      className="text-link"
                      onClick={async () => {
                        const n = Number(prompt("Current total value (₹)"));
                        if (n >= 0)
                          await saveEvent({
                            id: crypto.randomUUID(),
                            sourceId: s.id,
                            date: format(new Date(), "yyyy-MM-dd"),
                            kind: "valuation",
                            amount: n - balance,
                            notes: "Manual valuation update",
                          });
                      }}
                    >
                      Update value
                    </button>
                    <button
                      className="text-link danger"
                      onClick={async () => {
                        if (
                          confirm(
                            `Archive ${s.name}? Its history will be preserved.`,
                          )
                        )
                          await saveSource({ ...s, archived: true });
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Start with one savings source"
            text="Add a bank account, cash reserve, or investment holding."
          />
        )}
        <p className="helper-note">
          Total value combines opening balances, contributions, withdrawals, and
          manual valuation updates. Investment valuations are user entered, not
          live prices. Contributions, withdrawals, and transfers between your
          own sources are kept separate from income and spending.
        </p>
      </Card>
      <Card className="activity-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">RECENT MOVEMENTS</span>
            <h2>Savings activity</h2>
          </div>
        </div>
        {data.events.filter((e) => e.date.startsWith(month)).length ? (
          data.events
            .filter((e) => e.date.startsWith(month))
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <div className="event-row" key={e.id}>
                <div>
                  <b>
                    {e.kind === "transfer"
                      ? `${data.sources.find((s) => s.id === e.sourceId)?.name || "Archived source"} → ${data.sources.find((s) => s.id === e.targetSourceId)?.name || "Archived source"}`
                      : data.sources.find((s) => s.id === e.sourceId)?.name || "Archived source"}
                  </b>
                  <span>
                    {e.kind === "valuation" ? "Manual valuation" : e.kind} · {e.date}
                  </span>
                </div>
                <strong className={e.kind === "withdrawal" || (e.kind === "valuation" && e.amount < 0) || e.kind === "transfer" ? "danger" : ""}>
                  {e.kind === "withdrawal" || (e.kind === "valuation" && e.amount < 0) || e.kind === "transfer" ? "−" : "+"}
                  {money(Math.abs(e.amount), data.currency)}
                </strong>
              </div>
            ))
        ) : (
          <Empty title="No savings activity this month" />
        )}
      </Card>
      {transferFrom && (
        <div className="modal-backdrop" onClick={() => setTransferFrom(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">SAVINGS TRANSFER</span>
                <h2>Move money between sources</h2>
              </div>
              <button className="icon-button" aria-label="Close transfer dialog" onClick={() => setTransferFrom(null)}><X size={18} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const from = data.sources.find((source) => source.id === transferFrom);
              const to = list.find((source) => source.id === transferTarget);
              const amount = Number(transferAmount);
              if (!from || !to || from.id === to.id || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) > Math.round(sourceBalance(data, from.id) * 100)) {
                setTransferError("Choose a different active source and an amount within the available balance.");
                return;
              }
              await saveEvent({
                id: crypto.randomUUID(),
                sourceId: from.id,
                targetSourceId: to.id,
                date: format(new Date(), "yyyy-MM-dd"),
                kind: "transfer",
                amount,
                notes: `Transfer to ${to.name}`,
              });
              setTransferFrom(null);
            }}>
              <label>
                From
                <input disabled value={data.sources.find((source) => source.id === transferFrom)?.name || ""} />
              </label>
              <label>
                To
                <select required value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
                  {list.filter((source) => source.id !== transferFrom).map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                </select>
              </label>
              <label>
                Amount
                <div className="currency-input"><span>₹</span><input required type="number" min="0.01" step="0.01" max={sourceBalance(data, transferFrom)} value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} /></div>
                <small className="muted">Available: {money(sourceBalance(data, transferFrom), data.currency)}</small>
              </label>
              {transferError && <div className="form-error" role="alert">{transferError}</div>}
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setTransferFrom(null)}>Cancel</button>
                <button className="button button-primary">Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {show && (
        <div className="modal-backdrop" onClick={() => setShow(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">SAVINGS</span>
                <h2>Add a source</h2>
              </div>
              <button className="icon-button" onClick={() => setShow(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveSource({
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  type,
                  openingBalance: Number(opening),
                  archived: false,
                });
                setShow(false);
              }}
            >
              <label>
                Source name
                <input
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency fund"
                />
              </label>
              <label>
                Source type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {[
                    "Savings Account",
                    "Cash Savings",
                    "Emergency Fund",
                    "Fixed Deposit (FD)",
                    "Mutual Funds",
                    "Other",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Opening balance
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShow(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary">Add source</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function Analytics({ month }: { month: string }) {
  const { data } = useFinance();
  const selected = new Date(`${month}-01T12:00:00`);
  const months = Array.from({ length: 6 }, (_, i) =>
    monthKey(subMonths(selected, 5 - i)),
  );
  const rows = months.map((m) => {
    const t = totals(data, m);
    return {
      month: format(new Date(`${m}-01T12:00:00`), "MMM"),
      expenses: t.spent,
      savings: t.contributions,
    };
  });
  const cats = byCategory(totals(data, month).transactions);
  const max = Math.max(1, ...rows.map((x) => x.expenses));
  return (
    <>
      <PageHead
        eyebrow="THE BIGGER PICTURE"
        title="Analytics"
        sub="Patterns over time make better plans possible."
      />
      <div className="analytics-grid">
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">SPENDING TREND</span>
              <h2>Monthly expenses</h2>
            </div>
            <span className="pill">Last 6 months</span>
          </div>
          {rows.some((r) => r.expenses) ? (
            <div className="chart-placeholder">
              {rows.map((r) => (
                <div className="chart-col" key={r.month}>
                  <div className="chart-bars">
                    <i
                      className="bar-expense"
                      style={{
                        height: `${Math.max(3, (r.expenses / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>{r.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Not enough activity yet"
              text="Record a few expenses to see how your spending changes over time."
            />
          )}
          <div className="chart-legend">
            <span>
              <i className="bar-expense" />
              Monthly expenses
            </span>
          </div>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">THIS MONTH</span>
              <h2>Top categories</h2>
            </div>
          </div>
          {cats.length ? (
            cats.slice(0, 5).map((c, i) => (
              <div className="category-row" key={c.name}>
                <div className="cat-label">
                  <span className={`cat-dot dot-${i % 5}`} />
                  <span>{c.name}</span>
                  <b>{money(c.value, data.currency)}</b>
                </div>
                <div className="mini-track">
                  <i
                    className={`dot-${i % 5}`}
                    style={{
                      width: `${(c.value / Math.max(1, cats[0].value)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="No category data"
              text="Your category breakdown will appear here."
            />
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">SAVING HABITS</span>
              <h2>Contributions over time</h2>
            </div>
          </div>
          {rows.some((x) => x.savings) ? (
            rows.map((x) => (
              <div className="event-row" key={x.month}>
                <div>
                  <b>{x.month}</b>
                  <span>Savings contributions</span>
                </div>
                <strong>{money(x.savings, data.currency)}</strong>
              </div>
            ))
          ) : (
            <Empty
              title="No contributions recorded"
              text="Add savings contributions to track progress over time."
            />
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">BUDGET CHECK</span>
              <h2>Budget vs actual</h2>
            </div>
          </div>
          {rows.some((_, i) => totals(data, months[i]).budget !== undefined) ? (
            rows.map((r, i) => {
              const m = months[i],
                t = totals(data, m);
              return t.budget === undefined ? null : (
                <BudgetLine
                  key={m}
                  name={r.month}
                  actual={t.spent}
                  limit={t.budget}
                  currency={data.currency}
                />
              );
            })
          ) : (
            <Empty
              title="No saved budgets"
              text="Set a monthly budget to compare your plan with actual spending."
            />
          )}
        </Card>
      </div>
    </>
  );
}
function Coach({ month }: { month: string }) {
  const { data } = useFinance();
  const t = totals(data, month),
    cats = byCategory(t.transactions),
    insights: string[] = [];
  if (t.transactions.length) {
    if (cats.length)
      insights.push(
        `${cats[0].name} is your largest expense category at ${money(cats[0].value, data.currency)} (${Math.round((cats[0].value / Math.max(t.spent, 1)) * 100)}% of spending).`,
      );
    if (t.budget !== undefined)
      insights.push(
        t.remaining! < 0
          ? `You are ${money(-t.remaining!, data.currency)} over the budget you set. Review the categories that have room to adjust.`
          : `You have ${money(t.remaining!, data.currency)} remaining from your monthly budget.`,
      );
    if (t.income > 0)
      insights.push(
        `Your recorded net cash flow is ${money(t.net, data.currency)} (income minus expenses; savings contributions are separate).`,
      );
  }
  return (
    <>
      <PageHead
        eyebrow="YOUR THOUGHTFUL MONEY COMPANION"
        title="AI Money Coach"
        sub="Grounded observations from your own recorded data."
      />
      <div className="coach-layout">
        <Card className="coach-intro">
          <div className="coach-topline">
            <div className="coach-avatar">
              <Sparkles size={21} />
            </div>
            <span className="coach-private"><span /> Private · rule-based</span>
          </div>
          <span className="eyebrow">YOUR MONTHLY MONEY NOTE</span>
          <h2>A little clarity can change a lot.</h2>
          <p>
            These observations use transparent calculations on your records. No
            data is sent to an AI provider.
          </p>
          {insights.length ? (
            insights.map((x, i) => (
              <div className="coach-observation" key={i}>
                <Sparkles size={15} />
                <span>{x}</span>
              </div>
            ))
          ) : (
            <Empty
              title="A few records unlock your insights"
              text="Add transactions and set a budget to get useful observations."
            />
          )}
        </Card>
        <Card className="coach-snapshot">
          <div className="card-heading">
            <div>
              <span className="eyebrow">IN FOCUS · {format(new Date(`${month}-01T12:00:00`), "MMMM yyyy").toUpperCase()}</span>
              <h2>Your month at a glance</h2>
            </div>
            <div className="coach-snapshot-icon"><BarChart3 size={17} /></div>
          </div>
          <div className="coach-metric">
            <span>Qualifying expenses</span>
            <b>{money(t.spent, data.currency)}</b>
          </div>
          <div className="coach-metric">
            <span>Recorded income</span>
            <b>{money(t.income, data.currency)}</b>
          </div>
          <div className="coach-metric">
            <span>Savings contributions</span>
            <b>{money(t.contributions, data.currency)}</b>
          </div>
          <p className="helper-note">
            Observations are not personalized investment advice. Investment
            values are entered manually.
          </p>
        </Card>
      </div>
    </>
  );
}
function SettingsPage({
  halloweenActive,
  halloweenUntil,
  onToggleHalloween,
}: {
  halloweenActive: boolean;
  halloweenUntil: string | null;
  onToggleHalloween: () => void;
}) {
  const { data, setPref } = useFinance();
  return (
    <>
      <PageHead
        eyebrow="MAKE IT YOURS"
        title="Settings"
        sub="Personalize how PocketTrack works for you."
      />
      <div className="settings-layout">
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">APPEARANCE</span>
              <h2>Theme</h2>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <b>Color theme</b>
              <span>Choose a comfortable look for day or night.</span>
            </div>
            <button
              className="button button-outline"
              onClick={() =>
                setPref("theme", data.theme === "dark" ? "light" : "dark")
              }
            >
              {data.theme === "dark" ? (
                <>
                  <Sun size={16} /> Light mode
                </>
              ) : (
                <>
                  <Moon size={16} /> Dark mode
                </>
              )}
            </button>
          </div>
          <div className="setting-row halloween-setting-row">
            <div>
              <b><Ghost size={15} /> Halloween theme</b>
              <span>{halloweenActive && halloweenUntil
                ? `A little spooky, then it turns off on ${format(new Date(halloweenUntil), "d MMM yyyy")}.`
                : "A limited-time, creepy-but-calm look for 15 days. Saved on this device."}</span>
            </div>
            <button
              className={`button ${halloweenActive ? "button-primary" : "button-outline"}`}
              aria-pressed={halloweenActive}
              onClick={onToggleHalloween}
            >
              <Ghost size={16} /> {halloweenActive ? "Turn off theme" : "Try for 15 days"}
            </button>
          </div>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">PREFERENCES</span>
              <h2>Currency & region</h2>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <b>Display currency</b>
              <span>Dates use Indian locale formatting.</span>
            </div>
            <select
              value={data.currency}
              onChange={(e) => setPref("currency", e.target.value)}
            >
              <option value="INR">Indian Rupee (₹)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">Pound (£)</option>
            </select>
          </div>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">ACCOUNT</span>
              <h2>{supabase ? "Secure sync" : "Local workspace"}</h2>
            </div>
          </div>
          <p className="muted">
            {supabase
              ? "Your records are scoped to your signed-in account and protected by Supabase row-level security."
              : "Data is saved in this browser only until Supabase is configured. It will not sync across devices yet."}
          </p>
          {!supabase && (
            <div className="auth-message" role="status">
              {supabaseConfigurationError}
            </div>
          )}
          {supabase && (
            <button
              className="button button-outline"
              onClick={async () => {
                const client = supabase;
                if (client) {
                  await client.auth.signOut();
                  window.location.reload();
                }
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          )}
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <span className="eyebrow">YOUR DATA</span>
              <h2>Export options</h2>
            </div>
          </div>
          <p className="muted">
            Download an individual month's report from Dashboard or
            Transactions. Transfers are shown separately from income and
            expenses.
          </p>
        </Card>
      </div>
    </>
  );
}
function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "reset">(
    isPasswordRecoveryUrl() ? "reset" : "in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | null>(null);
  const isSignIn = mode === "in";
  const isSignUp = mode === "up";
  const isRecovery = mode === "forgot";
  const isReset = mode === "reset";
  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-story" aria-label="About PocketTrack">
          <a className="auth-brand" href="/" aria-label="PocketTrack home">
            <BrandMark />
            <span>Pocket<span>Track</span></span>
          </a>
          <div className="auth-story-copy">
            <span className="auth-kicker"><Sparkles size={14} /> MONEY, WITH MORE CLARITY</span>
            <h2>Make your money<br /><em>go further.</em></h2>
            <p>A calmer way to keep up with spending, build savings, and make progress on what matters to you.</p>
            <div className="auth-benefits">
              <div><span className="auth-benefit-icon"><Activity size={17} /></span><span><b>Know where it goes</b><small>See your spending in a clearer light.</small></span></div>
              <div><span className="auth-benefit-icon"><Wallet size={17} /></span><span><b>Build a little momentum</b><small>Keep savings and goals close at hand.</small></span></div>
            </div>
          </div>
          <span className="auth-story-foot">A little more mindful, every month.</span>
          <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
        </section>
        <div className="auth-card">
          <div className="auth-mobile-brand"><BrandMark /><span>Pocket<span>Track</span></span></div>
          <div className="auth-heading">
            <span className="auth-card-kicker">YOUR FINANCES, IN FOCUS</span>
            <h1>
          {isSignIn
            ? "Welcome back"
            : isSignUp
              ? "Start with PocketTrack"
              : isRecovery
                ? "Reset your password"
                : "Choose a new password"}
            </h1>
            <p>
          {isSignIn
            ? "Sign in to see your money, clearly."
            : isSignUp
              ? "Create an account to keep your finances in sync."
              : isRecovery
                ? "We’ll email you a secure password reset link."
                : "Choose a new password for your account."}
            </p>
          </div>
          {(isSignIn || isSignUp) && (
            <>
              <div className="oauth-options" aria-label="Continue with Google">
                <OAuthButton provider="google" label="Google" busy={oauthBusy} onClick={async () => {
                  if (!supabase) return;
                  setOauthBusy("google"); setMessage("");
                  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
                  if (error) { setMessage(error.message); setOauthBusy(null); }
                }} />
              </div>
              <div className="auth-divider"><span>or continue with email</span></div>
            </>
          )}
          <form
          onSubmit={async (e) => {
            e.preventDefault();
            const client = supabase;
            if (!client) return;
            if (isReset && password !== confirmPassword) {
              setMessage("Those passwords don’t match.");
              return;
            }
            setBusy(true);
            setMessage("");
            try {
              if (isRecovery) {
                const result = await client.auth.resetPasswordForEmail(email, {
                  redirectTo: window.location.origin,
                });
                setMessage(
                  result.error?.message ||
                    "If an account exists for that email, a reset link is on its way.",
                );
              } else if (isReset) {
                const result = await client.auth.updateUser({ password });
                if (result.error) setMessage(result.error.message);
                else {
                  await client.auth.signOut();
                  window.history.replaceState(
                    null,
                    document.title,
                    window.location.pathname,
                  );
                  setPassword("");
                  setConfirmPassword("");
                  setMode("in");
                  setMessage("Password updated. Sign in with your new password.");
                }
              } else if (isSignIn) {
                const result = await client.auth.signInWithPassword({
                  email,
                  password,
                });
                if (result.error) setMessage(result.error.message);
                else window.location.reload();
              } else {
                const result = await client.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: window.location.origin },
                });
                if (result.error) setMessage(result.error.message);
                else if (result.data.session) window.location.reload();
                else setMessage("Check your email to confirm your account.");
              }
            } catch {
              setMessage("Authentication is temporarily unavailable. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {!isReset && (
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {!isRecovery && (
            <label>
              Password
              <input
                required
                type="password"
                minLength={8}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {isReset && (
            <label>
              Confirm new password
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          )}
          {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
          <button className="button button-primary" disabled={busy}>
            {busy ? "Please wait…" : isSignIn ? "Sign in" : isSignUp ? "Create account" : isRecovery ? "Send reset link" : "Update password"}
          </button>
          </form>
        {isSignIn && (
          <button className="text-link auth-switch" onClick={() => { setMode("forgot"); setMessage(""); }}>
            Forgot password?
          </button>
        )}
        {(isSignIn || isSignUp) && (
          <button
            className="text-link auth-switch"
            onClick={() => {
              setMode(isSignIn ? "up" : "in");
              setMessage("");
            }}
          >
            {isSignIn
              ? "New to PocketTrack? Create account"
              : "Already have an account? Sign in"}
          </button>
        )}
        {(isRecovery || isReset) && (
          <button className="text-link auth-switch" onClick={() => { setMode("in"); setMessage(""); }}>
            Back to sign in
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

function OAuthButton({ provider, label, busy, onClick }: { provider: "google"; label: string; busy: "google" | null; onClick: () => void }) {
  return <button type="button" className={`oauth-button oauth-${provider}`} onClick={onClick} disabled={!!busy} aria-label={`Continue with ${label}`}>
    <span className="oauth-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.1H12v3.97h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.84-1.7 2.9-4.2 2.9-7.26Z"/><path fill="#34A853" d="M12 21.6c2.62 0 4.82-.87 6.43-2.36l-3.14-2.45c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.7-5.44-4H3.31v2.53A9.71 9.71 0 0 0 12 21.6Z"/><path fill="#FBBC05" d="M6.56 13.72a5.84 5.84 0 0 1 0-3.44V7.75H3.31a9.66 9.66 0 0 0 0 8.5l3.25-2.53Z"/><path fill="#EA4335" d="M12 6.28c1.43 0 2.71.5 3.72 1.48l2.8-2.8A9.36 9.36 0 0 0 12 2.4a9.71 9.71 0 0 0-8.69 5.35l3.25 2.53c.77-2.3 2.91-4 5.44-4Z"/></svg>
    </span><span>{busy === provider ? "Connecting…" : label}</span>
  </button>;
}
async function exportPdf(
  data: ReturnType<typeof useFinance>["data"],
  month: string,
) {
  const { doc, filename } = await createMonthlyPdf(data, month);
  doc.save(filename);
}
function Goals() {
  const { data, saveGoal } = useFinance();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const goals = data.goals.filter((g) => g.status !== "archived");
  return (
    <>
      <PageHead
        eyebrow="A LITTLE CLOSER EACH DAY"
        title="Goals"
        sub="Turn the thing you want into a plan you can follow."
      >
        <button className="button button-primary" onClick={() => setShow(true)}>
          <Plus size={16} /> New goal
        </button>
      </PageHead>
      {goals.length ? (
        <div className="goal-grid">
          {goals.map((g) => {
            const current = g.current,
              pct = Math.min(
                100,
                Math.round((current / Math.max(g.target, 1)) * 100),
              ),
              remaining = Math.max(0, g.target - current),
              months = g.targetDate
                ? Math.max(
                    1,
                    Math.ceil(
                      (new Date(`${g.targetDate}T12:00:00`).getTime() -
                        Date.now()) /
                        (30.44 * 86400000),
                    ),
                  )
                : undefined;
            return (
              <Card key={g.id} className="goal-card">
                <div className="goal-top">
                  <div className="goal-icon">
                    <Target size={18} />
                  </div>
                  <span className={`priority ${g.priority}`}>
                    {g.priority} priority
                  </span>
                </div>
                <h2>{g.name}</h2>
                <p>{g.notes || "One thoughtful step at a time."}</p>
                <div className="goal-values">
                  <b>
                    {money(current, data.currency)} <small>saved</small>
                  </b>
                  <span>of {money(g.target, data.currency)}</span>
                </div>
                <div className="progress-track">
                  <i className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="progress-foot">
                  <span>{pct}% complete</span>
                  <span>{money(remaining, data.currency)} to go</span>
                </div>
                <div className="goal-deadline">
                  {g.targetDate
                    ? `Target ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${g.targetDate}T12:00:00`))}${months ? ` · approx. ${money(remaining / months, data.currency)} / month` : ""}`
                    : "No target date"}
                </div>
                <div className="source-actions">
                  <button
                    className="text-link"
                    onClick={async () => {
                      const edited = prompt("Goal name", g.name);
                      if (edited?.trim()) {
                        const amount = Number(
                          prompt("Goal target amount", String(g.target)),
                        );
                        if (amount > 0)
                          await saveGoal({
                            ...g,
                            name: edited.trim(),
                            target: amount,
                          });
                      }
                    }}
                  >
                    Edit goal
                  </button>
                  <button
                    className="text-link"
                    onClick={async () => {
                      const n = Number(
                        prompt("Update current saved amount", String(current)),
                      );
                      if (Number.isFinite(n) && n >= 0)
                        await saveGoal({ ...g, current: n });
                    }}
                  >
                    Update amount
                  </button>
                  <button
                    className="text-link"
                    onClick={async () =>
                      saveGoal({
                        ...g,
                        status: g.status === "paused" ? "active" : "paused",
                      })
                    }
                  >
                    {g.status === "paused"
                      ? "Resume"
                      : g.status === "completed"
                        ? "Completed"
                        : "Pause"}
                  </button>
                  {g.status !== "completed" && (
                    <button
                      className="text-link"
                      onClick={async () => {
                        if (confirm(`Mark “${g.name}” as completed?`))
                          await saveGoal({ ...g, status: "completed" });
                      }}
                    >
                      Complete
                    </button>
                  )}
                  <button
                    className="text-link danger"
                    onClick={async () => {
                      if (confirm(`Archive “${g.name}”?`))
                        await saveGoal({ ...g, status: "archived" });
                    }}
                  >
                    Archive
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Empty
            title="Your next milestone starts here"
            text="Create a savings goal and we’ll help you track your progress."
          />
        </Card>
      )}
      {show && (
        <div className="modal-backdrop" onClick={() => setShow(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>Create a goal</h2>
              <button
                className="icon-button"
                onClick={() => setShow(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveGoal({
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  target: Number(target),
                  current: 0,
                  targetDate: date || undefined,
                  priority,
                  status: "active",
                  createdAt: new Date().toISOString(),
                });
                setShow(false);
              }}
            >
              <label>
                Goal name
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New laptop"
                />
              </label>
              <label>
                Target amount
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </label>
              <label>
                Target date <span className="optional">Optional</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Priority
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShow(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary">Create goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
export default App;
