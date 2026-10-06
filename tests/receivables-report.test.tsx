import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivablesReport } from "../src/react-app/components/ReceivablesReport";
import { request } from "../src/react-app/api/client";
vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});
function show() {
	return render(
		<ReceivablesReport
			accounts={[
				{ id: 1, name: "Receivables", type: "cash", sequence: 1, created_at: "" },
				{ id: 2, name: "Other", type: "cash", sequence: 2, created_at: "" },
				{
					id: 3,
					name: "Crypto",
					type: "investment",
					sequence: 3,
					created_at: "",
					valuation_mode: "crypto",
				},
			]}
			money={(amount) => `Rp ${amount}`}
		/>,
	);
}
it("waits for selection, excludes crypto, shows totals and settled toggle", async () => {
	vi.mocked(request).mockResolvedValue({
		account_id: 1,
		items: [
			{
				description: "Andi",
				lent: 1000,
				repaid: 400,
				outstanding: 600,
				transaction_count: 2,
			},
			{ description: "Budi", lent: 500, repaid: 500, outstanding: 0, transaction_count: 2 },
			{ description: null, lent: 0, repaid: 50, outstanding: -50, transaction_count: 1 },
		],
	});
	show();
	const user = userEvent.setup();
	expect(request).not.toHaveBeenCalled();
	expect(screen.queryByRole("option", { name: "Crypto" })).toBeNull();
	await user.selectOptions(screen.getByLabelText("Receivables account"), "1");
	await screen.findByText("Andi");
	expect(request).toHaveBeenCalledWith("/reports/receivables?account_id=1");
	expect(screen.getByText("Total owed").textContent).toContain("Rp 600");
	expect(screen.queryByText("Budi")).toBeNull();
	expect(screen.getByText("Missing description")).toBeTruthy();
	expect(screen.getByText("Credit / overpayment")).toBeTruthy();
	await user.click(screen.getByLabelText("Include settled balances"));
	expect(screen.getByText("Budi")).toBeTruthy();
});
it("shows failures with retry and an empty result", async () => {
	vi.mocked(request)
		.mockRejectedValueOnce(new Error("Unavailable"))
		.mockResolvedValueOnce({ account_id: 1, items: [] });
	show();
	const user = userEvent.setup();
	await user.selectOptions(screen.getByLabelText("Receivables account"), "1");
	await screen.findByRole("alert");
	await user.click(screen.getByRole("button", { name: "Try again" }));
	await screen.findByText("No transfers for this account yet.");
});
it("ignores a late response after switching accounts", async () => {
	let complete!: (data: unknown) => void;
	vi.mocked(request)
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		)
		.mockResolvedValueOnce({ account_id: 2, items: [] });
	show();
	const user = userEvent.setup();
	await user.selectOptions(screen.getByLabelText("Receivables account"), "1");
	await user.selectOptions(screen.getByLabelText("Receivables account"), "2");
	await screen.findByText("No transfers for this account yet.");
	complete({
		account_id: 1,
		items: [{ description: "Wrong account", lent: 100, repaid: 0, outstanding: 100 }],
	});
	await waitFor(() => expect(screen.queryByText("Wrong account")).toBeNull());
});
