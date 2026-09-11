import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountQuery, categoryQuery, reportQuery, transactionQuery } from "../api/queries";
import type { DashboardFilters, View } from "../types";
import { errorMessage } from "../utils/errors";

import { currentMonth, monthRange } from "../utils/period";

const emptyFilters: DashboardFilters = { account: "", type: "", category: "", from: "", to: "" };

export function useMoneyManagerData(view: View) {
	const client = useQueryClient();
	const [filters, setFilters] = useState<DashboardFilters>(() => ({
		...emptyFilters,
		...monthRange(currentMonth()),
	}));
	const [actionError, setActionError] = useState("");
	const [dismissedFetchError, setDismissedFetchError] = useState<Error | undefined>(undefined);
	const needsAccounts = view === "dashboard" || view === "transactions" || view === "accounts";
	const needsCategories = view === "dashboard" || view === "transactions" || view === "settings";
	const needsTransactions = view === "dashboard" || view === "transactions";
	const needsReport = view === "dashboard" || view === "reports";
	const transactionFilters = useMemo(
		() =>
			view === "dashboard"
				? { ...emptyFilters, from: filters.from, to: filters.to }
				: filters,
		[filters, view],
	);
	const accounts = useQuery({ ...accountQuery(), enabled: needsAccounts });
	const categories = useQuery({ ...categoryQuery(), enabled: needsCategories });
	const transactions = useQuery({
		...transactionQuery(transactionFilters),
		enabled: needsTransactions,
	});
	const report = useQuery({ ...reportQuery(filters), enabled: needsReport });

	// This shared hook stays mounted across pages. Recheck freshness on navigation;
	// fetchQuery reuses fresh cache entries and deduplicates in-flight requests.
	useEffect(() => {
		if (view === "dashboard" || view === "transactions" || view === "accounts")
			void client.fetchQuery(accountQuery()).catch(() => {});
		if (view === "dashboard" || view === "transactions" || view === "settings")
			void client.fetchQuery(categoryQuery()).catch(() => {});
		if (view === "dashboard" || view === "transactions")
			void client.fetchQuery(transactionQuery(transactionFilters)).catch(() => {});
		if (view === "dashboard" || view === "reports")
			void client.fetchQuery(reportQuery(filters)).catch(() => {});
	}, [client, filters, transactionFilters, view]);
	const active = [
		...(needsAccounts ? [accounts] : []),
		...(needsCategories ? [categories] : []),
		...(needsTransactions ? [transactions] : []),
		...(needsReport ? [report] : []),
	];
	const loading = active.some((query) => query.isFetching);
	const initialLoading = active.some((query) => query.isLoading);
	const fetchError = active.find((query) => query.error)?.error;
	const error =
		actionError ||
		(fetchError && fetchError !== dismissedFetchError
			? errorMessage(fetchError, "Could not refresh data. Please try again.")
			: "");
	const setError = useCallback(
		(message: string) => {
			setActionError(message);
			setDismissedFetchError(fetchError ?? undefined);
		},
		[fetchError],
	);

	// Invalidate every cached filter variant; only visible queries refetch immediately.
	const refreshTransactions = useCallback(async () => {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["transactions"] }),
			client.invalidateQueries({ queryKey: ["accounts"] }),
			client.invalidateQueries({ queryKey: ["reports"] }),
		]);
	}, [client]);
	const refreshAccounts = useCallback(async () => {
		await client.invalidateQueries({ queryKey: ["accounts"] });
	}, [client]);
	const refreshCategories = useCallback(async () => {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["categories"] }),
			client.invalidateQueries({ queryKey: ["reports"] }),
		]);
	}, [client]);

	return {
		accounts: accounts.data ?? [],
		categories: categories.data ?? [],
		transactions: transactions.data ?? [],
		report: report.data ?? [],
		filters,
		setFilters,
		error,
		setError,
		loading,
		initialLoading,
		refreshTransactions,
		refreshAccounts,
		refreshCategories,
	};
}
