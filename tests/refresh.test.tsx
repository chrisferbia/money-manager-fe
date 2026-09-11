import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import App from "../src/react-app/App";
import { createQueryClient, reportQuery, transactionQuery } from "../src/react-app/api/queries";
import { currentMonth, monthRange } from "../src/react-app/utils/period";
import { request } from "../src/react-app/api/client";

vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
let balance = 10000;
let client: ReturnType<typeof createQueryClient>;
const count = (prefix: string) =>
	mockRequest.mock.calls.filter(([path, options]) => path.startsWith(prefix) && !options?.method)
		.length;

beforeEach(() => {
	window.location.hash = "dashboard";
	balance = 10000;
	mockRequest.mockReset();
	mockRequest.mockImplementation(async (path, options) => {
		if (options?.method) {
			balance = 9000;
			return { id: 1 };
		}
		if (path.startsWith("/accounts"))
			return [{ id: 1, name: "Wallet", type: "cash", sequence: 1, balance }];
		if (path.startsWith("/categories"))
			return [{ id: 1, name: "Food", type: "expense", sequence: 1 }];
		if (path.startsWith("/reports")) return [{ id: 1, name: "Food", total: 1000 }];
		return [];
	});
	HTMLDialogElement.prototype.showModal = function () {
		this.open = true;
	};
	HTMLDialogElement.prototype.close = function () {
		this.open = false;
	};
	window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(0), 0);
	window.cancelAnimationFrame = (id) => window.clearTimeout(id);
	client = createQueryClient();
	client.setDefaultOptions({ queries: { staleTime: 30_000, retry: false } });
});
afterEach(() => {
	cleanup();
	client.clear();
	focusManager.setFocused(undefined);
});
async function start() {
	render(
		<QueryClientProvider client={client}>
			<App />
		</QueryClientProvider>,
	);
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	await screen.findByText("Current balances");
}

it("reuses fresh data when switching Overview and Transactions", async () => {
	await start();
	const before = mockRequest.mock.calls.length;
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await screen.findByText("Transaction history");
	fireEvent.click(screen.getByRole("button", { name: "Overview", exact: true }));
	await screen.findByText("Current balances");
	expect(mockRequest.mock.calls.length).toBe(before);
});

it("preserves category drilldown and caches matching filters", async () => {
	await start();
	fireEvent.click(screen.getByRole("button", { name: "View transactions for Food" }));
	await waitFor(() =>
		expect(
			mockRequest.mock.calls.some(([path]) => path.startsWith("/transactions?category_id=1")),
		).toBe(true),
	);
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect(screen.getByRole("button", { name: "Remove category filter" })).toBeTruthy();
	const before = count("/transactions");
	fireEvent.click(screen.getByRole("button", { name: "Overview", exact: true }));
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await screen.findByText("Transaction history");
	expect(count("/transactions")).toBe(before);
});

it("keeps amount focus and refreshes balances after saving without fetching categories", async () => {
	await start();
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Add transaction", exact: true }));
	await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(true));
	const amount = screen.getByLabelText("Amount (IDR)");
	await user.selectOptions(screen.getByLabelText("Category"), "1");
	await user.type(amount, "1000");
	expect(document.activeElement).toBe(amount);
	expect((amount as HTMLInputElement).value).toBe("1000");
	const categoriesBefore = count("/categories");
	await user.click(screen.getByRole("button", { name: /Add expense/ }));
	await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(false));
	await user.click(screen.getByRole("button", { name: "Accounts", exact: true }));
	await waitFor(() =>
		expect(client.getQueryData<Array<{ balance: number }>>(["accounts"])?.[0].balance).toBe(
			9000,
		),
	);
	expect(screen.getAllByText(/9\.000/).length).toBeGreaterThan(0);
	expect(count("/categories")).toBe(categoriesBefore);
	expect(
		client.getQueryState(reportQuery(monthRange(currentMonth())).queryKey)?.isInvalidated,
	).toBe(true);
});

it("keeps search and expanded filters during background refresh", async () => {
	await start();
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	fireEvent.change(screen.getByRole("textbox", { name: "Search transactions" }), {
		target: { value: "coffee" },
	});
	fireEvent.click(screen.getByRole("button", { name: /^Show filters/ }));
	await act(async () => {
		await client.invalidateQueries({ queryKey: ["transactions"] });
	});
	expect(
		(screen.getByRole("textbox", { name: "Search transactions" }) as HTMLInputElement).value,
	).toBe("coffee");
	expect(screen.getByRole("button", { name: "Hide filters" })).toBeTruthy();
});

it("refreshes stale data on focus without fetching fresh categories", async () => {
	await start();
	const before = count("/accounts");
	await act(async () => {
		await client.invalidateQueries({ queryKey: ["accounts"], refetchType: "none" });
	});
	act(() => {
		focusManager.setFocused(false);
		focusManager.setFocused(true);
	});
	await waitFor(() => expect(count("/accounts")).toBe(before + 1));
	expect(count("/categories")).toBe(1);
});

it("updates balances even when the transaction refresh fails and preserves the saved result", async () => {
	await start();
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	const original = mockRequest.getMockImplementation()!;
	mockRequest.mockImplementation(async (path, options) => {
		if (path.startsWith("/transactions") && !options?.method)
			throw new Error("Transaction list unavailable");
		return original(path, options);
	});
	balance = 8000;
	await act(async () => {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["accounts"] }),
			client.invalidateQueries({ queryKey: ["transactions"] }),
		]);
	});
	await screen.findByText("Transaction list unavailable");
	expect(client.getQueryData<Array<{ balance: number }>>(["accounts"])?.[0].balance).toBe(8000);
	fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
	expect(screen.queryByText("Transaction list unavailable")).toBeNull();
});

it("does not show a slow old filter response under the newly selected filter", async () => {
	await start();
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	fireEvent.click(screen.getByRole("button", { name: /^Show filters/ }));
	let resolveOld!: (value: unknown) => void;
	const oldResponse = new Promise((resolve) => {
		resolveOld = resolve;
	});
	const original = mockRequest.getMockImplementation()!;
	mockRequest.mockImplementation(async (path, options) => {
		if (path.startsWith("/transactions?type=expense")) return oldResponse;
		return original(path, options);
	});
	const typeSelect = screen.getByLabelText("Type");
	fireEvent.change(typeSelect, { target: { value: "expense" } });
	await waitFor(() =>
		expect(
			mockRequest.mock.calls.some(([path]) => path.startsWith("/transactions?type=expense")),
		).toBe(true),
	);
	fireEvent.change(typeSelect, { target: { value: "income" } });
	await waitFor(() =>
		expect(
			mockRequest.mock.calls.some(([path]) => path.startsWith("/transactions?type=income")),
		).toBe(true),
	);
	await act(async () => {
		resolveOld([
			{
				id: 99,
				description: "Outdated expense",
				type: "expense",
				amount: 1,
				occurred_at: "2026-01-01",
				created_at: "2026-01-01",
			},
		]);
	});
	expect(screen.queryByText("Outdated expense")).toBeNull();
	expect((typeSelect as HTMLSelectElement).value).toBe("income");
});

it("revalidates expired shared transactions on navigation", async () => {
	await start();
	const before = count("/transactions");
	act(() => {
		client.setQueryData(
			transactionQuery({ account: "", type: "", category: "", ...monthRange(currentMonth()) })
				.queryKey,
			[],
			{ updatedAt: Date.now() - 31_000 },
		);
	});
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await waitFor(() => expect(count("/transactions")).toBe(before + 1));
});

it("opens and saves two consecutive transactions, then opens again after navigation", async () => {
	await start();
	const user = userEvent.setup();
	for (let index = 0; index < 2; index++) {
		await user.click(screen.getByRole("button", { name: "Add transaction", exact: true }));
		await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(true));
		await user.selectOptions(screen.getByLabelText("Category"), "1");
		await user.type(screen.getByLabelText("Amount (IDR)"), "1000");
		await user.click(screen.getByRole("button", { name: /Add expense/ }));
		await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(false));
	}
	expect(mockRequest.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(
		2,
	);
	await user.click(screen.getByRole("button", { name: "Overview", exact: true }));
	await user.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	expect(document.querySelector("dialog")?.open).toBe(false);
	await user.click(screen.getByRole("button", { name: "Add transaction", exact: true }));
	await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(true));
});

it("clears both report dates together and preserves the category drilldown", async () => {
	await start();
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Reports", exact: true }));
	fireEvent.change(screen.getByLabelText("Period mode"), { target: { value: "custom" } });
	fireEvent.change(screen.getByLabelText("Period from"), { target: { value: "2026-09-01" } });
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	fireEvent.change(screen.getByLabelText("Period to"), { target: { value: "2026-09-11" } });
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	await user.selectOptions(screen.getByLabelText("Period mode"), "all");
	expect((screen.getByLabelText("Period mode") as HTMLSelectElement).value).toBe("all");
	await user.click(screen.getByRole("button", { name: "View transactions for Food" }));
	await waitFor(() =>
		expect(
			mockRequest.mock.calls.some(([path]) => path.startsWith("/transactions?category_id=1")),
		).toBe(true),
	);
});

it("Overview totals and chart share dates while retaining transaction-only filters on return", async () => {
	const original = mockRequest.getMockImplementation()!;
	mockRequest.mockImplementation(async (path, options) => {
		if (!path.startsWith("/transactions") || options?.method) return original(path, options);
		const params = new URLSearchParams(path.split("?")[1]);
		const rows = [
			{
				id: 1,
				type: "income",
				account_id: 2,
				category_id: null,
				related_account_id: null,
				amount: 7000,
				description: "Salary",
				counterparty: null,
				occurred_at: "2026-09-11T01:00:00Z",
				created_at: "2026-09-11T01:00:00Z",
			},
			{
				id: 2,
				type: "expense",
				account_id: 1,
				category_id: 1,
				related_account_id: null,
				amount: 1000,
				description: "Meal",
				counterparty: null,
				occurred_at: "2026-09-11T02:00:00Z",
				created_at: "2026-09-11T02:00:00Z",
			},
		];
		return rows.filter(
			(row) =>
				(!params.get("account_id") ||
					String(row.account_id) === params.get("account_id")) &&
				(!params.get("category_id") ||
					String(row.category_id) === params.get("category_id")) &&
				(!params.get("type") || row.type === params.get("type")),
		);
	});
	await start();
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await user.click(screen.getByRole("button", { name: /^Show filters/ }));
	for (const [label, value] of [
		["Filter by account", "1"],
		["Filter by category", "1"],
		["Filter by type", "expense"],
	]) {
		await user.selectOptions(screen.getByLabelText(label), value);
		await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	}
	await user.selectOptions(screen.getByLabelText("Period mode"), "custom");
	for (const label of ["Period from", "Period to"]) {
		fireEvent.change(screen.getByLabelText(label), { target: { value: "2026-09-11" } });
		await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	}
	await user.click(screen.getByRole("button", { name: "Overview", exact: true }));
	await screen.findByText("All accounts and categories · 2026-09-11 – 2026-09-11");
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	const stats = Array.from(document.querySelectorAll(".stat-card"));
	expect(stats.find((card) => card.textContent?.includes("Income"))?.textContent).toContain(
		"7.000",
	);
	expect(stats.find((card) => card.textContent?.includes("Expenses"))?.textContent).toContain(
		"1.000",
	);
	expect(
		screen.getByRole("button", { name: "View transactions for Food" }).textContent,
	).toContain("1.000");
	const transactionPaths = mockRequest.mock.calls.filter(([path]) =>
		path.startsWith("/transactions"),
	);
	const params = new URLSearchParams(transactionPaths.at(-1)![0].split("?")[1]);
	expect(Object.fromEntries(params)).toEqual({
		from: "2026-09-10T17:00:00Z",
		to: "2026-09-11T16:59:59Z",
	});
	const reportPaths = mockRequest.mock.calls.filter(([path]) => path.startsWith("/reports"));
	expect(new URLSearchParams(reportPaths.at(-1)![0].split("?")[1]).toString()).toBe(
		params.toString(),
	);
	await user.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await user.click(screen.getByRole("button", { name: /^Show filters/ }));
	for (const [label, value] of [
		["Filter by account", "1"],
		["Filter by category", "1"],
		["Filter by type", "expense"],
		["Period from", "2026-09-11"],
		["Period to", "2026-09-11"],
	]) {
		expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value);
	}
});

it("defaults to this month and preserves the selected month across navigation and filter clearing", async () => {
	await start();
	expect((screen.getByLabelText("Selected month") as HTMLInputElement).value).toBe(
		currentMonth(),
	);
	expect(screen.queryByText("Total balance")).toBeNull();
	expect(screen.getByText("Net change")).toBeTruthy();
	fireEvent.change(screen.getByLabelText("Selected month"), { target: { value: "2028-02" } });
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect((screen.getByLabelText("Selected month") as HTMLInputElement).value).toBe("2028-01");
	fireEvent.click(screen.getByRole("button", { name: "Next month" }));
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	fireEvent.click(screen.getByRole("button", { name: "View transactions for Food" }));
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect((screen.getByLabelText("Selected month") as HTMLInputElement).value).toBe("2028-02");
	fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect((screen.getByLabelText("Selected month") as HTMLInputElement).value).toBe("2028-02");
	expect(screen.getByText("No transactions in February 2028")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "This month" }));
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect((screen.getByLabelText("Selected month") as HTMLInputElement).value).toBe(
		currentMonth(),
	);
});
