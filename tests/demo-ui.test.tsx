import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppShell } from "../src/react-app/components/AppShell";
import { TransactionRows } from "../src/react-app/components/TransactionRows";
import type { Transaction } from "../src/react-app/types";

it("labels the public view and removes write controls", () => {
	render(
		<AppShell
			demoMode
			view="dashboard"
			error=""
			notice=""
			loading={false}
			initialLoading={false}
			onAddTransaction={vi.fn()}
			onViewChange={vi.fn()}
			onDismissError={vi.fn()}
		>
			<p>Demo dashboard</p>
		</AppShell>,
	);
	expect(screen.getByText("Demo data · Read only")).toBeTruthy();
	expect(screen.getByText(/fictional demo data/)).toBeTruthy();
	expect(screen.queryByRole("button", { name: /add transaction/i })).toBeNull();
	expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
});

it("shows demo transactions without opening an edit form", () => {
	const transaction: Transaction = {
		id: 1,
		type: "expense",
		account_id: 1,
		category_id: 1,
		related_account_id: null,
		amount: 15000,
		counterparty: null,
		description: "Lunch",
		occurred_at: "2026-09-08T12:00:00Z",
		created_at: "2026-09-08T12:00:00Z",
		transaction_subtype: null,
	};
	render(
		<TransactionRows
			readOnly
			transactions={[transaction]}
			accountNames={new Map([[1, "Cash"]])}
			categoryNames={new Map([[1, "Food"]])}
			money={(amount) => `Rp ${amount}`}
			onEdit={vi.fn()}
		/>,
	);
	expect(screen.getByText("Lunch")).toBeTruthy();
	expect(screen.queryByRole("button", { name: /open expense transaction/i })).toBeNull();
});
