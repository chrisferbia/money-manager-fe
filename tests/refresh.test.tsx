import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import App from "../src/react-app/App";
import { createQueryClient } from "../src/react-app/api/queries";
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
	await screen.findByText("Balances");
}

it("reuses fresh data when switching Overview and Transactions", async () => {
	await start();
	const before = mockRequest.mock.calls.length;
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await screen.findByText("Transaction history");
	fireEvent.click(screen.getByRole("button", { name: "Overview", exact: true }));
	await screen.findByText("Balances");
	expect(mockRequest.mock.calls.length).toBe(before);
});

it("preserves category drilldown and caches matching filters", async () => {
	await start();
	fireEvent.click(screen.getByRole("button", { name: "View transactions for Food" }));
	await waitFor(() =>
		expect(
			mockRequest.mock.calls.some(([path]) => path === "/transactions?category_id=1"),
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
	expect(client.getQueryState(["reports", ""])?.isInvalidated).toBe(true);
});

it("keeps search and expanded filters during background refresh", async () => {
	await start();
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	fireEvent.change(screen.getByRole("textbox", { name: "Search transactions" }), {
		target: { value: "coffee" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Show filters" }));
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
	fireEvent.click(screen.getByRole("button", { name: "Show filters" }));
	let resolveOld!: (value: unknown) => void;
	const oldResponse = new Promise((resolve) => {
		resolveOld = resolve;
	});
	const original = mockRequest.getMockImplementation()!;
	mockRequest.mockImplementation(async (path, options) => {
		if (path === "/transactions?type=expense") return oldResponse;
		return original(path, options);
	});
	const typeSelect = screen.getByLabelText("Type");
	fireEvent.change(typeSelect, { target: { value: "expense" } });
	await waitFor(() =>
		expect(mockRequest.mock.calls.some(([path]) => path === "/transactions?type=expense")).toBe(
			true,
		),
	);
	fireEvent.change(typeSelect, { target: { value: "income" } });
	await waitFor(() =>
		expect(mockRequest.mock.calls.some(([path]) => path === "/transactions?type=income")).toBe(
			true,
		),
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
		client.setQueryData(["transactions", ""], [], { updatedAt: Date.now() - 31_000 });
	});
	fireEvent.click(screen.getByRole("button", { name: "Transactions", exact: true }));
	await waitFor(() => expect(count("/transactions")).toBe(before + 1));
});
