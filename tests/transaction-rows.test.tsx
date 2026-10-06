import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionRows } from "../src/react-app/components/TransactionRows";
import type { Transaction } from "../src/react-app/types";

afterEach(cleanup);
const base: Transaction = {
	id: 1,
	type: "expense",
	account_id: 1,
	category_id: 1,
	related_account_id: null,
	amount: 30000,
	counterparty: "Corner café",
	description: "Breakfast",
	occurred_at: "2026-10-05T10:00:00Z",
	created_at: "2026-10-06T10:00:00Z",
	transaction_subtype: null,
};
function show(transactions = [base], readOnly = false, groupByCreatedAt = false) {
	const onEdit = vi.fn();
	const view = render(
		<TransactionRows
			transactions={transactions}
			readOnly={readOnly}
			groupByCreatedAt={groupByCreatedAt}
			subtotalTransactions={transactions}
			accountNames={
				new Map([
					[1, "BCA"],
					[2, "Cash"],
				])
			}
			categoryNames={new Map([[1, "Food"]])}
			money={(amount) => `Rp ${amount}`}
			onEdit={onEdit}
		/>,
	);
	return { ...view, onEdit };
}
it("shows four inline labels instead of separate column headers", () => {
	const { container } = show([base, { ...base, id: 2, occurred_at: "2026-10-04T10:00:00Z" }]);
	expect(container.querySelectorAll(".transaction-column-labels")).toHaveLength(0);
	const row = container.querySelector(".transaction-row")!;
	expect(row.querySelectorAll(".transaction-field-label")).toHaveLength(4);
	expect(row.textContent).toContain("Cat:Food");
	expect(row.textContent).toContain("Desc:Breakfast");
	expect(row.textContent).toContain("Acc:BCA");
	expect(row.textContent).toContain("PayTo:Corner café");
});
it("uses From for income and a positive amount", () => {
	const { container } = show([{ ...base, type: "income", counterparty: "Employer" }]);
	expect(container.querySelector(".transaction-counterparty")?.textContent).toBe("From:Employer");
	expect(container.querySelector(".transaction-amount")?.textContent).toBe("+Rp 30000");
});
it("shows transfer direction, description, and a neutral unsigned amount", () => {
	const { container } = show([
		{
			...base,
			type: "transfer",
			category_id: null,
			related_account_id: 2,
			description: "ATM withdrawal",
		},
	]);
	expect(container.querySelector(".transaction-category")?.textContent).toBe("Type:Transfer");
	expect(container.querySelector(".transaction-account")?.textContent).toContain("From:BCA");
	expect(container.querySelector(".transaction-account")?.textContent).toBe("From:BCA");
	expect(container.querySelector(".transaction-desktop-destination")).toBeNull();
	expect(container.querySelector(".transaction-counterparty")?.textContent).toBe("To:Cash");
	expect(container.querySelector(".transaction-amount")?.textContent).toBe("Rp 30000");
	expect(container.querySelector(".transaction-description")?.textContent).toBe(
		"Desc:ATM withdrawal",
	);
});
it("opens editing immediately on row click without expanding details", async () => {
	const user = userEvent.setup();
	const { container, onEdit } = show();
	await user.click(container.querySelector(".transaction-row")!);
	expect(onEdit).toHaveBeenCalledWith(base, expect.any(HTMLElement));
	expect(onEdit).toHaveBeenCalledTimes(1);
	expect(container.querySelector("details")).toBeNull();
});
it("does not let demo users open editing", async () => {
	const user = userEvent.setup();
	const { container, onEdit } = show([base], true);
	await user.click(container.querySelector(".transaction-row")!);
	expect((container.querySelector(".transaction-row") as HTMLButtonElement).disabled).toBe(true);
	expect(onEdit).not.toHaveBeenCalled();
});
it("opens editing using Enter or Space", async () => {
	const user = userEvent.setup();
	const { onEdit } = show();
	await user.tab();
	await user.keyboard("{Enter}");
	await user.keyboard(" ");
	expect(onEdit).toHaveBeenCalledTimes(2);
});
it("preserves created-date grouping and missing-value placeholders", () => {
	const { container } = show([{ ...base, description: null, counterparty: null }], false, true);
	expect(screen.getByRole("heading", { name: /Added Oct 6, 2026/ })).toBeTruthy();
	expect(container.querySelector(".transaction-description")?.textContent).toBe("Desc:-");
	expect(container.querySelector(".transaction-counterparty")?.textContent).toBe("PayTo:-");
});
it("does not show column labels for an empty list", () => {
	const { container } = show([]);
	expect(screen.getByText("No transactions yet")).toBeTruthy();
	expect(container.querySelector(".transaction-column-labels")).toBeNull();
});
