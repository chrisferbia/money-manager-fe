import { useCallback, useEffect, useState } from "react";
import { request } from "../api/client";
import type { Account, Category, DashboardFilters, ReportItem, Transaction } from "../types";
import { errorMessage } from "../utils/errors";
import { sortTransactions } from "../utils/transactions";

const emptyFilters: DashboardFilters = { account: "", type: "", category: "", from: "", to: "" };

export function useMoneyManagerData() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [report, setReport] = useState<ReportItem[]>([]);
	const [filters, setFilters] = useState<DashboardFilters>(emptyFilters);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const transactionParams = new URLSearchParams();
			if (filters.account) transactionParams.set("account_id", filters.account);
			if (filters.category) transactionParams.set("category_id", filters.category);
			if (filters.type) transactionParams.set("type", filters.type);
			if (filters.from) transactionParams.set("from", `${filters.from}T00:00:00Z`);
			if (filters.to) transactionParams.set("to", `${filters.to}T23:59:59Z`);

			const reportParams = new URLSearchParams();
			if (filters.from) reportParams.set("from", `${filters.from}T00:00:00Z`);
			if (filters.to) reportParams.set("to", `${filters.to}T23:59:59Z`);

			const [accountData, categoryData, transactionData, reportData] = await Promise.all([
				request<Account[]>("/accounts?include_balance=true"),
				request<Category[]>("/categories"),
				request<Transaction[]>(`/transactions?${transactionParams}`),
				request<ReportItem[]>(`/reports/expenses-by-category?${reportParams}`),
			]);

			setAccounts(accountData);
			setCategories(categoryData);
			setTransactions(sortTransactions(transactionData));
			setReport(reportData);
			setError("");
		} catch (reason) {
			setError(errorMessage(reason, "Could not connect to the backend."));
		} finally {
			setLoading(false);
			setHasLoaded(true);
		}
	}, [filters]);

	const refreshAccounts = useCallback(async () => {
		const accountData = await request<Account[]>("/accounts?include_balance=true");
		setAccounts(accountData);
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return {
		accounts,
		categories,
		transactions,
		report,
		filters,
		setFilters,
		error,
		setError,
		loading,
		initialLoading: loading && !hasLoaded,
		refresh,
		refreshAccounts,
	};
}
