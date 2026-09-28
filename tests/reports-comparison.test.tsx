import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReportsView } from "../src/react-app/components/ReportsView";

afterEach(cleanup);

const money = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
const savingsHistory = { account_count: 0, months: [] };
const categories = [
	{
		id: 1,
		name: "Food",
		type: "expense" as const,
		sequence: 1,
		monthly_budget: 120_000,
		created_at: "2026-01-01",
	},
	{
		id: 2,
		name: "Transport",
		type: "expense" as const,
		sequence: 2,
		monthly_budget: null,
		created_at: "2026-01-01",
	},
	{
		id: 3,
		name: "Utilities",
		type: "expense" as const,
		sequence: 3,
		monthly_budget: 100_000,
		created_at: "2026-01-01",
	},
];

it("compares every current and previous-month expense category", () => {
	const onCategorySelect = vi.fn();
	render(
		<ReportsView
			report={[
				{ id: 1, name: "Food", total: 150_000 },
				{ id: 2, name: "Transport", total: 40_000 },
			]}
			previousReport={[
				{ id: 1, name: "Food", total: 100_000 },
				{ id: 3, name: "Utilities", total: 75_000 },
			]}
			reportMonth="2026-09"
			categories={categories}
			savingsHistory={savingsHistory}
			money={money}
			onCategorySelect={onCategorySelect}
		/>,
	);

	expect(screen.getByText("Sep 2026")).toBeTruthy();
	expect(screen.getByText("Aug 2026")).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "View transactions for Food" }).textContent,
	).toContain("Increased by Rp 50.000");
	expect(
		screen.getByRole("button", { name: "View transactions for Transport" }).textContent,
	).toContain("Increased by Rp 40.000");
	expect(
		screen.getByRole("button", { name: "View transactions for Utilities" }).textContent,
	).toContain("Decreased by Rp 75.000");

	const previousOnly = screen.getByRole("button", { name: "View transactions for Utilities" });
	fireEvent.click(previousOnly);
	expect(onCategorySelect).toHaveBeenCalledWith(3);

	fireEvent.click(screen.getByRole("button", { name: "Budget" }));
	expect(screen.getByText("Monthly budget")).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "View transactions for Food" }).textContent,
	).toContain("Over budget by Rp 30.000");
	expect(
		screen.getByRole("button", { name: "View transactions for Transport" }).textContent,
	).toContain("No budget set");
	expect(
		screen.getByRole("button", { name: "View transactions for Utilities" }).textContent,
	).toContain("Rp 100.000 remaining");
});

it("explains that comparison needs a monthly period", () => {
	render(
		<ReportsView
			report={[{ id: 1, name: "Food", total: 150_000 }]}
			previousReport={[]}
			reportMonth=""
			categories={categories}
			savingsHistory={savingsHistory}
			money={money}
			onCategorySelect={() => {}}
		/>,
	);

	expect(screen.getByText("Choose Monthly to compare with last month or a budget.")).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "View transactions for Food" }).textContent,
	).not.toContain("last month");
	expect(screen.queryByText(/Increased by/i)).toBeNull();
});
