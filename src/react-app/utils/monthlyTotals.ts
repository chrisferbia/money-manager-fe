import type { Transaction } from "../types";
import { currentMonth, shiftMonth } from "./period";

export function monthlyTotals(transactions: Transaction[], endMonth: string) {
	const months = Array.from({ length: 6 }, (_, index) => ({
		month: shiftMonth(endMonth, index - 5),
		income: 0,
		expenses: 0,
	}));
	for (const transaction of transactions) {
		const month = months.find(
			(item) => item.month === currentMonth(new Date(transaction.occurred_at)),
		);
		if (!month) continue;
		if (transaction.type === "income") month.income += transaction.amount;
		if (transaction.type === "expense") month.expenses += transaction.amount;
	}
	return months;
}
