import { useMemo, useState } from "react";
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
	Category,
	CategoryDraft,
	DisplayCurrency,
	EntryForm,
	Transaction,
	View,
} from "./types";

function App() {
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
		refresh,
		refreshAccounts,
	} = useMoneyManagerData();
	const [view, setView] = useState<View>("dashboard");
	const [entry, setEntry] = useState<EntryForm>(blankEntry());
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [accountDraft, setAccountDraft] = useState({ name: "", type: "cash" });
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({
		name: "",
		type: "expense",
	});
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [currency, setCurrency] = useState<DisplayCurrency>(() =>
		typeof window === "undefined" ? "IDR" : readCurrency(),
	);
	const [notice, setNotice] = useState("");
	const [saving, setSaving] = useState(false);

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

	function selectView(next: View) {
		setView(next);
		setError("");
		setNotice("");
	}
	function changeCurrency(next: DisplayCurrency) {
		setCurrency(next);
		persistCurrency(next);
	}

	return (
		<AppShell
			view={view}
			error={error}
			notice={notice}
			loading={loading}
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
