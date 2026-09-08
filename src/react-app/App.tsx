import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { useMoneyManagerData } from "./hooks/useMoneyManagerData";
import { useMoneyManagerActions } from "./hooks/useMoneyManagerActions";
import { AccountsView } from "./components/AccountsView";
import { AppShell } from "./components/AppShell";
import { Dashboard } from "./components/Dashboard";
import { ReportsView } from "./components/ReportsView";
import { SettingsView } from "./components/SettingsView";
import { TransactionsView } from "./components/TransactionsView";
import { createMoneyFormatter, persistCurrency, readCurrency } from "./utils/currency";
import { blankEntry } from "./utils/forms";
import { createNameMaps } from "./utils/maps";
import type {
	Account,
	AccountDraft,
	Category,
	CategoryDraft,
	DisplayCurrency,
	EntryForm,
	Transaction,
	TransactionSort,
	View,
} from "./types";

const viewIds: View[] = ["dashboard", "transactions", "accounts", "reports", "settings"];

function readViewFromHash(): View {
	if (typeof window === "undefined") return "dashboard";
	const candidate = window.location.hash.slice(1) as View;
	return viewIds.includes(candidate) ? candidate : "dashboard";
}

function App() {
	const [view, setView] = useState<View>(readViewFromHash);
	const {
		accounts,
		categories,
		transactions,
		report,
		filters,
		setFilters,
		error,
		setError,
		loading,
		initialLoading,
		refresh,
		refreshAccounts,
	} = useMoneyManagerData(view);
	const [entry, setEntry] = useState<EntryForm>(blankEntry());
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [accountDraft, setAccountDraft] = useState<AccountDraft>({
		name: "",
		type: "cash",
		sequence: "",
	});
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({
		name: "",
		type: "expense",
		sequence: "",
	});
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [currency, setCurrency] = useState<DisplayCurrency>(() =>
		typeof window === "undefined" ? "IDR" : readCurrency(),
	);
	const [notice, setNotice] = useState("");
	const [saving, setSaving] = useState(false);
	const [addTransactionRequest, setAddTransactionRequest] = useState(0);
	const [transactionSort, setTransactionSort] = useState<TransactionSort>("occurred-desc");

	const { accountNames, categoryNames } = useMemo(
		() => createNameMaps(accounts, categories),
		[accounts, categories],
	);
	const expenseCategories = categories.filter((item) => item.type === "expense");
	const incomeCategories = categories.filter((item) => item.type === "income");
	const income = transactions
		.filter((item) => item.type === "income")
		.reduce((sum, item) => sum + item.amount, 0);
	const expenses = transactions
		.filter((item) => item.type === "expense")
		.reduce((sum, item) => sum + item.amount, 0);
	const balance = accounts.reduce((sum, item) => sum + (item.balance ?? 0), 0);
	const money = createMoneyFormatter(currency);
	const actions = useMoneyManagerActions({
		accounts,
		filters,
		refresh,
		refreshAccounts,
		setError,
		setNotice,
		setSaving,
		setView,
		setEntry,
		setEditing,
		setAccountDraft,
		setEditingAccount,
		setCategoryDraft,
		setEditingCategory,
	});

	useEffect(() => {
		const handleLocationChange = () => {
			setView(readViewFromHash());
			setError("");
			setNotice("");
		};
		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
		};
	}, [setError, setNotice]);

	function selectView(next: View) {
		setView(next);
		if (typeof window !== "undefined" && window.location.hash !== `#${next}`)
			window.location.hash = next;
		setError("");
		setNotice("");
	}
	function changeCurrency(next: DisplayCurrency) {
		setCurrency(next);
		persistCurrency(next);
	}
	function openTransactionComposer() {
		setError("");
		setNotice("");
		selectView("transactions");
		setAddTransactionRequest((request) => request + 1);
	}
	function openAccountTransactions(accountId: number) {
		setFilters({ account: String(accountId), type: "", category: "", from: "", to: "" });
		selectView("transactions");
	}
	function openCategoryTransactions(categoryId: number) {
		setFilters({
			account: "",
			type: "",
			category: String(categoryId),
			from: filters.from,
			to: filters.to,
		});
		selectView("transactions");
	}

	return (
		<AppShell
			view={view}
			error={error}
			notice={notice}
			loading={loading}
			initialLoading={initialLoading}
			onAddTransaction={openTransactionComposer}
			onViewChange={selectView}
			onDismissError={() => setError("")}
		>
			{view === "dashboard" && (
				<Dashboard
					accounts={accounts}
					accountNames={accountNames}
					categoryNames={categoryNames}
					transactions={transactions}
					report={report}
					income={income}
					expenses={expenses}
					balance={balance}
					money={money}
					onAccountSelect={openAccountTransactions}
					onNavigate={selectView}
				/>
			)}
			{view === "transactions" && (
				<TransactionsView
					accounts={accounts}
					categories={categories}
					filters={filters}
					setFilters={setFilters}
					transactions={transactions}
					accountNames={accountNames}
					categoryNames={categoryNames}
					entry={entry}
					setEntry={setEntry}
					editing={editing}
					saving={saving}
					expenseCategories={expenseCategories}
					incomeCategories={incomeCategories}
					money={money}
					sort={transactionSort}
					onSortChange={setTransactionSort}
					openAddRequest={addTransactionRequest}
					onAddRequestHandled={() => setAddTransactionRequest(0)}
					onSave={(event) => actions.saveEntry(event, entry, editing)}
					onEdit={actions.editTransaction}
					onDelete={actions.deleteTransaction}
					onCancel={actions.resetEntry}
				/>
			)}
			{view === "accounts" && (
				<AccountsView
					accounts={accounts}
					loading={loading}
					money={money}
					draft={accountDraft}
					setDraft={setAccountDraft}
					editing={editingAccount}
					setEditing={setEditingAccount}
					saving={saving}
					deletingId={actions.deletingAccountId}
					onAccountSelect={openAccountTransactions}
					onSave={(event) => actions.saveAccount(event, accountDraft, editingAccount)}
					onDelete={actions.deleteAccount}
				/>
			)}
			{view === "reports" && (
				<ReportsView
					report={report}
					money={money}
					fromDate={filters.from}
					toDate={filters.to}
					setFromDate={(value) => setFilters({ ...filters, from: value })}
					setToDate={(value) => setFilters({ ...filters, to: value })}
					onCategorySelect={openCategoryTransactions}
				/>
			)}
			{view === "settings" && (
				<SettingsView
					categories={categories}
					draft={categoryDraft}
					setDraft={setCategoryDraft}
					editing={editingCategory}
					setEditing={setEditingCategory}
					saving={saving}
					deletingId={actions.deletingCategoryId}
					onSaveCategory={(event) =>
						actions.saveCategory(event, categoryDraft, editingCategory)
					}
					onDeleteCategory={actions.deleteCategory}
					currency={currency}
					onCurrencyChange={changeCurrency}
				/>
			)}
		</AppShell>
	);
}

export default App;
