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
let price = "1500000000";

beforeEach(() => {
	client = createQueryClient();
	client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
	quantity = "0.01";
	price = "1500000000";
	mockRequest.mockReset();
	vi.spyOn(window, "confirm").mockReturnValue(true);
	mockRequest.mockImplementation(async (path, options) => {
		if (path === "/accounts/1/holdings/refresh-prices") {
			price = "2000000000";
			const holdings = await mockRequest("/accounts/1/holdings");
			return { requested_count: 1, refreshed_count: 1, failed_coin_ids: [], holdings };
		}
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
							price_idr: price,
							value_idr: Number(price) * Number(quantity),
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

function showHoldings(readOnly = false, onHoldingsChange = vi.fn().mockResolvedValue(undefined)) {
	render(
		<QueryClientProvider client={client}>
			<CryptoHoldingsPanel
				account={account}
				readOnly={readOnly}
				onHoldingsChange={onHoldingsChange}
			/>
		</QueryClientProvider>,
	);
	return onHoldingsChange;
}

it("manually refreshes fresh prices and updates the holding without changing quantity", async () => {
	const user = userEvent.setup();
	const changed = showHoldings();
	await screen.findByText("0.01 BTC", { exact: false });
	await user.click(screen.getByRole("button", { name: "Refresh prices" }));
	await screen.findByText("Latest available prices fetched. Account value updated.");
	expect(mockRequest).toHaveBeenCalledWith("/accounts/1/holdings/refresh-prices", {
		method: "POST",
	});
	expect(screen.getByText("Rp 2.000.000.000", { exact: false })).toBeTruthy();
	expect(changed).toHaveBeenCalledTimes(1);
	expect(quantity).toBe("0.01");
});

it("keeps old prices on provider failure and allows another attempt", async () => {
	const user = userEvent.setup();
	const changed = showHoldings();
	await screen.findByText("0.01 BTC", { exact: false });
	mockRequest.mockRejectedValueOnce(
		new Error("Provider unavailable. Last known prices were kept."),
	);
	await user.click(screen.getByRole("button", { name: "Refresh prices" }));
	expect((await screen.findByRole("alert")).textContent).toContain("Last known prices were kept");
	expect(screen.getByText("Rp 1.500.000.000", { exact: false })).toBeTruthy();
	expect(changed).not.toHaveBeenCalled();
	await user.click(screen.getByRole("button", { name: "Refresh prices" }));
	await screen.findByText("Latest available prices fetched. Account value updated.");
});

it("warns about partially refreshed prices instead of reporting full success", async () => {
	const user = userEvent.setup();
	showHoldings();
	await screen.findByText("0.01 BTC", { exact: false });
	const holdings = client.getQueryData(["crypto-holdings", 1]);
	mockRequest.mockResolvedValueOnce({
		requested_count: 2,
		refreshed_count: 1,
		failed_coin_ids: ["ethereum"],
		holdings,
	});
	await user.click(screen.getByRole("button", { name: "Refresh prices" }));
	expect((await screen.findByRole("alert")).textContent).toContain(
		"Refreshed 1 of 2 prices. Could not refresh ethereum",
	);
	expect(
		screen.queryByText("Latest available prices fetched. Account value updated."),
	).toBeNull();
});

it("blocks duplicate refreshes while fetching", async () => {
	const user = userEvent.setup();
	showHoldings();
	await screen.findByText("0.01 BTC", { exact: false });
	let complete!: (value: unknown) => void;
	const holdings = client.getQueryData(["crypto-holdings", 1]);
	mockRequest.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				complete = resolve;
			}),
	);
	await user.dblClick(screen.getByRole("button", { name: "Refresh prices" }));
	expect(
		(screen.getByRole("button", { name: "Refreshing prices…" }) as HTMLButtonElement).disabled,
	).toBe(true);
	expect(
		mockRequest.mock.calls.filter(([path]) => path.endsWith("/refresh-prices")),
	).toHaveLength(1);
	complete({ requested_count: 1, refreshed_count: 1, failed_coin_ids: [], holdings });
	await screen.findByText("Latest available prices fetched. Account value updated.");
});

it("hides manual refresh in the read-only demo", async () => {
	showHoldings(true);
	await screen.findByText("0.01 BTC", { exact: false });
	expect(screen.queryByRole("button", { name: "Refresh prices" })).toBeNull();
});

it("disables refresh when there are no holdings", async () => {
	quantity = "";
	showHoldings();
	await screen.findByText(/No crypto added yet/);
	expect(
		(screen.getByRole("button", { name: "Refresh prices" }) as HTMLButtonElement).disabled,
	).toBe(true);
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
		screen.getByRole("button", { name: "Manage crypto holdings for Crypto wallet" })
			.textContent,
	).toContain("15.000.000");
});
