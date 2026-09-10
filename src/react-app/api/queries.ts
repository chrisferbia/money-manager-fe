import { QueryClient, queryOptions } from "@tanstack/react-query";
import { request } from "./client";
import type { Account, Category, DashboardFilters, ReportItem, Transaction } from "../types";
import { sortTransactions } from "../utils/transactions";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
	});
}

export const accountQuery = () =>
	queryOptions({
		queryKey: ["accounts"],
		queryFn: ({ signal }) => request<Account[]>("/accounts?include_balance=true", { signal }),
	});

export const categoryQuery = () =>
	queryOptions({
		queryKey: ["categories"],
		queryFn: ({ signal }) => request<Category[]>("/categories", { signal }),
		staleTime: 5 * 60_000,
	});

// The backend stores and compares UTC timestamps at whole-second precision.
function localDateBoundary(date: string, time: string) {
	return new Date(date + "T" + time).toISOString().replace(".000Z", "Z");
}

export function transactionQuery(filters: DashboardFilters) {
	const params = new URLSearchParams();
	if (filters.account) params.set("account_id", filters.account);
	if (filters.category) params.set("category_id", filters.category);
	if (filters.type) params.set("type", filters.type);
	if (filters.from) params.set("from", localDateBoundary(filters.from, "00:00:00"));
	if (filters.to) params.set("to", localDateBoundary(filters.to, "23:59:59"));
	return queryOptions({
		queryKey: ["transactions", params.toString()],
		queryFn: async ({ signal }) =>
			sortTransactions(await request<Transaction[]>(`/transactions?${params}`, { signal })),
	});
}

export function reportQuery(filters: Pick<DashboardFilters, "from" | "to">) {
	const params = new URLSearchParams();
	if (filters.from) params.set("from", localDateBoundary(filters.from, "00:00:00"));
	if (filters.to) params.set("to", localDateBoundary(filters.to, "23:59:59"));
	return queryOptions({
		queryKey: ["reports", params.toString()],
		queryFn: ({ signal }) =>
			request<ReportItem[]>(`/reports/expenses-by-category?${params}`, { signal }),
	});
}
