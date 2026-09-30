import { monthRange } from "./utils/period";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import { PeriodSelector } from "./components/PeriodSelector";
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

function App({
	accountControl,
	demoMode = false,
	demoMonth,
}: { accountControl?: ReactNode; demoMode?: boolean; demoMonth?: string } = {}) {
	const [view, setView] = useState<View>(() => {
		const initial = readViewFromHash();
		return demoMode && initial === "settings" ? "dashboard" : initial;
	});
	const {
		accounts,
		categories,
		transactions,
		report,
		previousReport,
		reportMonth,
		savingsHistory,
		filters,
		setFilters,
		error,
		setError,
		loading,
		initialLoading,
		refreshTransactions,
		refreshCategories,
		refreshAccounts,
	} = useMoneyManagerData(view, demoMode ? demoMonth : undefined);
	const [currency, setCurrency] = useState<DisplayCurrency>(() =>
		typeof window === "undefined" ? "IDR" : readCurrency(),
	);
	const [notice, setNotice] = useState("");
	const [addTransactionRequest, setAddTransactionRequest] = useState(0);
	const nextAddTransactionRequest = useRef(0);
	const [transactionSort, setTransactionSort] = useState<TransactionSort>("occurred-desc");
	const [selectedCryptoAccountId, setSelectedCryptoAccountId] = useState<number | null>(null);

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
			const next = readViewFromHash();
			setView(demoMode && next === "settings" ? "dashboard" : next);
			setError("");
			setNotice("");
		};
		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
		};
	}, [demoMode, setError, setNotice]);

	function selectView(next: View) {
		if (demoMode && next === "settings") return;
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
		if (demoMode) return;
		setError("");
		setNotice("");
		selectView("transactions");
		setAddTransactionRequest(++nextAddTransactionRequest.current);
	}
	function openAccountTransactions(accountId: number) {
		if (accounts.find((account) => account.id === accountId)?.valuation_mode === "crypto") {
			openCryptoHoldings(accountId);
			selectView("accounts");
			return;
		}
		setFilters({
			account: String(accountId),
			type: "",
			category: "",
			from: filters.from,
			to: filters.to,
		});
		selectView("transactions");
	}
	function openCryptoHoldings(accountId: number) {
		setSelectedCryptoAccountId(accountId);
		window.requestAnimationFrame(() =>
			document
				.getElementById("crypto-holdings-panel")
				?.scrollIntoView({ behavior: "smooth" }),
		);
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
			demoMode={demoMode}
			view={view}
			error={error}
			notice={notice}
			loading={loading}
			initialLoading={initialLoading}
			accountControl={accountControl}
			onAddTransaction={openTransactionComposer}
			onViewChange={selectView}
			onDismissError={() => setError("")}
		>
			{["dashboard", "transactions", "reports"].includes(view) && (
				<PeriodSelector
					from={filters.from}
					to={filters.to}
					onChange={(range) => setFilters((current) => ({ ...current, ...range }))}
				/>
			)}
			{view === "dashboard" && (
				<Dashboard
					readOnly={demoMode}
					onMonthSelect={(month) =>
						setFilters((current) => ({ ...current, ...monthRange(month) }))
					}
					fromDate={filters.from}
					toDate={filters.to}
					accounts={accounts}
					accountNames={accountNames}
					categoryNames={categoryNames}
					transactions={transactions}
					report={report}
					income={income}
					expenses={expenses}
					money={money}
					onAccountSelect={openAccountTransactions}
					onCategorySelect={openCategoryTransactions}
					onNavigate={(next) => {
						if (next === "transactions")
							setFilters((current) => ({
								...current,
								account: "",
								type: "",
								category: "",
							}));
						selectView(next);
					}}
				/>
			)}
			{view === "transactions" && (
				<TransactionsView
					readOnly={demoMode}
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
					readOnly={demoMode}
					accounts={accounts}
					loading={loading}
					money={money}
					draft={accountDraft}
					setDraft={setAccountDraft}
					editing={editingAccount}
					setEditing={setEditingAccount}
					saving={actions.accountSaving}
					deletingId={actions.deletingAccountId}
					selectedCryptoAccountId={selectedCryptoAccountId}
					onCryptoAccountSelect={openCryptoHoldings}
					onHoldingsChange={refreshAccounts}
					onAccountSelect={openAccountTransactions}
					onSave={actions.saveAccount}
					onDelete={actions.deleteAccount}
				/>
			)}
			{view === "reports" && (
				<ReportsView
					report={report}
					previousReport={previousReport}
					reportMonth={reportMonth}
					categories={categories}
					savingsHistory={savingsHistory}
					money={money}
					onCategorySelect={openCategoryTransactions}
				/>
			)}
			{view === "settings" && !demoMode && (
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
					money={money}
				/>
			)}
		</AppShell>
	);
}

export default App;
