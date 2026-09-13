// @vitest-environment node
import { expect, it } from "vitest";
import { monthlyTotals } from "../src/react-app/utils/monthlyTotals";
import type { Transaction } from "../src/react-app/types";
it("groups six local calendar months, fills empty months and excludes transfers", () => {
	const rows = [
		{ type: "income", amount: 100, occurred_at: "2026-12-31T18:00:00Z" },
		{ type: "expense", amount: 40, occurred_at: "2027-01-15T00:00:00Z" },
		{ type: "transfer", amount: 900, occurred_at: "2027-01-15T00:00:00Z" },
		{ type: "expense", amount: 12, occurred_at: "2026-07-01T00:00:00Z" },
	] as Transaction[];
	const result = monthlyTotals(rows, "2027-01");
	expect(result.map((item) => item.month)).toEqual([
		"2026-08",
		"2026-09",
		"2026-10",
		"2026-11",
		"2026-12",
		"2027-01",
	]);
	expect(result[5]).toEqual({ month: "2027-01", income: 100, expenses: 40 });
	expect(result.slice(0, 5).every((item) => item.income === 0 && item.expenses === 0)).toBe(true);
});
