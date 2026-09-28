import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { CryptoHoldingsPanel } from "../src/react-app/components/CryptoHoldingsPanel";
import { Dashboard } from "../src/react-app/components/Dashboard";
import { createQueryClient } from "../src/react-app/api/queries";
import { request } from "../src/react-app/api/client";

vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
const account = {
	id: 1,
	name: "Crypto wallet",
	type: "investment",
	sequence: 1,
	created_at: "2026-01-01",
	valuation_mode: "crypto" as const,
	balance: 15_000_000,
};
let client: ReturnType<typeof createQueryClient>;
let quantity = "0.01";

beforeEach(() => {
	client = createQueryClient();
	client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
	quantity = "0.01";
	mockRequest.mockReset();
	vi.spyOn(window, "confirm").mockReturnValue(true);
	mockRequest.mockImplementation(async (path, options) => {
		if (path.startsWith("/crypto/search")) {
			return [{ coin_id: "bitcoin", name: "Bitcoin", symbol: "BTC" }];
		}
		if (path === "/accounts/1/holdings" && options?.method === "POST") {
			quantity = JSON.parse(options.body as string).quantity;
			return { id: 1 };
		}
		if (path === "/accounts/1/holdings/1" && options?.method === "PATCH") {
			quantity = JSON.parse(options.body as string).quantity;
			return { id: 1 };
		}
		if (path === "/accounts/1/holdings/1" && options?.method === "DELETE") {
			quantity = "";
			return undefined;
		}
		if (path === "/accounts/1/holdings") {
			return quantity
				? [
						{
							id: 1,
							account_id: 1,
							coin_id: "bitcoin",
							name: "Bitcoin",
							symbol: "BTC",
							quantity,
							price_idr: "1500000000",
							value_idr: 15_000_000,
							fetched_at: "2026-09-28T00:00:00Z",
							provider_updated_at: null,
							price_status: "fresh",
						},
					]
				: [];
		}
		return [];
	});
});

afterEach(() => {
	cleanup();
	client.clear();
	vi.restoreAllMocks();
});

it("shows IDR market value and lets users add, edit, and remove holdings", async () => {
	const user = userEvent.setup();
	const onHoldingsChange = vi.fn().mockResolvedValue(undefined);
	render(
		<QueryClientProvider client={client}>
			<CryptoHoldingsPanel account={account} onHoldingsChange={onHoldingsChange} />
		</QueryClientProvider>,
	);
	const panel = screen.getByRole("region", { name: "Crypto wallet crypto holdings" });
	expect(panel.textContent).toContain("15.000.000");
	await screen.findByText("0.01 BTC", { exact: false });
	await user.click(screen.getByRole("button", { name: "Edit quantity" }));
	const editInput = screen.getByRole("textbox", { name: "Quantity for Bitcoin" });
	await user.clear(editInput);
	await user.type(editInput, "0.02");
	await user.click(screen.getByRole("button", { name: "Save quantity" }));
	await screen.findByText("0.02 BTC", { exact: false });
	await user.click(screen.getByRole("button", { name: "Remove" }));
	await screen.findByText(/No crypto added yet/);
	await user.type(screen.getByRole("textbox", { name: "Search cryptocurrency" }), "bitcoin");
	await user.click(screen.getByRole("button", { name: "Search" }));
	await user.click(await screen.findByRole("button", { name: "Bitcoin BTC" }));
	await user.type(screen.getByRole("textbox", { name: "Quantity owned" }), "0.01");
	await user.click(screen.getByRole("button", { name: "Add holding" }));
	await screen.findByText("0.01 BTC", { exact: false });
	expect(onHoldingsChange).toHaveBeenCalledTimes(3);
});

it("shows an incomplete total when a price is unavailable", async () => {
	mockRequest.mockResolvedValue([
		{
			id: 1,
			account_id: 1,
			coin_id: "bitcoin",
			name: "Bitcoin",
			symbol: "BTC",
			quantity: "0.01",
			price_idr: null,
			value_idr: null,
			fetched_at: null,
			provider_updated_at: null,
			price_status: "unavailable",
		},
	]);
	render(
		<QueryClientProvider client={client}>
			<CryptoHoldingsPanel
				account={{ ...account, balance: null }}
				onHoldingsChange={vi.fn()}
			/>
		</QueryClientProvider>,
	);
	await waitFor(() => expect(screen.getAllByText("Price unavailable").length).toBeGreaterThan(0));
	expect(await screen.findByText("Market price unavailable")).toBeTruthy();
});

it("shows crypto value in its account card without an Overall money card", async () => {
	render(
		<QueryClientProvider client={client}>
			<Dashboard
				onMonthSelect={vi.fn()}
				fromDate="2026-09-01"
				toDate="2026-09-30"
				accounts={[
					account,
					{
						id: 2,
						name: "Bank",
						type: "bank",
						sequence: 2,
						created_at: "2026-01-01",
						balance: 20_000_000,
					},
				]}
				accountNames={new Map()}
				categoryNames={new Map()}
				transactions={[]}
				report={[]}
				income={0}
				expenses={0}
				money={(amount) => `Rp ${amount}`}
				onAccountSelect={vi.fn()}
				onCategorySelect={vi.fn()}
				onNavigate={vi.fn()}
			/>
		</QueryClientProvider>,
	);
	expect(screen.queryByText("Overall money")).toBeNull();
	expect(
		screen.getByRole("button", { name: "Manage crypto holdings for Crypto wallet" }).textContent,
	).toContain("15.000.000");
});
