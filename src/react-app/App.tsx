import { useEffect, useMemo, useRef, useState } from "react";
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

import { createNameMaps } from "./utils/maps";
import type { DisplayCurrency, TransactionSort, View } from "./types";

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
		refreshTransactions,
		refreshCategories,
		refreshAccounts,
	} = useMoneyManagerData(view);
	const [currency, setCurrency] = useState<DisplayCurrency>(() =>
		typeof window === "undefined" ? "IDR" : readCurrency(),
	);
	const [notice, setNotice] = useState("");
	const [addTransactionRequest, setAddTransactionRequest] = useState(0);
	const nextAddTransactionRequest = useRef(0);
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
		refreshTransactions,
		refreshCategories,
		refreshAccounts,
		setError,
		setNotice,
		setView,
	});

	const {
		entry,
		setEntry,
		editing,
		accountDraft,
		setAccountDraft,
		editingAccount,
		setEditingAccount,
		categoryDraft,
		setCategoryDraft,
		editingCategory,
		setEditingCategory,
	} = actions;

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
		setAddTransactionRequest(++nextAddTransactionRequest.current);
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
					fromDate={filters.from}
					toDate={filters.to}
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
					onCategorySelect={openCategoryTransactions}
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
					saving={actions.transactionSaving}
					expenseCategories={expenseCategories}
					incomeCategories={incomeCategories}
					money={money}
					sort={transactionSort}
					onSortChange={setTransactionSort}
					openAddRequest={addTransactionRequest}
					onAddRequestHandled={() => setAddTransactionRequest(0)}
					onSave={actions.saveEntry}
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
					saving={actions.accountSaving}
					deletingId={actions.deletingAccountId}
					onAccountSelect={openAccountTransactions}
					onSave={actions.saveAccount}
					onDelete={actions.deleteAccount}
				/>
			)}
			{view === "reports" && (
				<ReportsView
					report={report}
					money={money}
					fromDate={filters.from}
					toDate={filters.to}
					setFromDate={(value) => setFilters((current) => ({ ...current, from: value }))}
					setToDate={(value) => setFilters((current) => ({ ...current, to: value }))}
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
					saving={actions.categorySaving}
					deletingId={actions.deletingCategoryId}
					onSaveCategory={actions.saveCategory}
					onDeleteCategory={actions.deleteCategory}
					currency={currency}
					onCurrencyChange={changeCurrency}
				/>
			)}
		</AppShell>
	);
}

export default App;
