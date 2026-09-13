import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { transactionQuery } from "../api/queries";
import type { MoneyFormatter } from "../types";
import { currentMonth, monthRange, selectedMonth, shiftMonth } from "../utils/period";
import { monthlyTotals } from "../utils/monthlyTotals";

export function IncomeExpenseChart({
	from,
	to,
	money,
	onMonthSelect,
}: {
	from: string;
	to: string;
	money: MoneyFormatter;
	onMonthSelect: (month: string) => void;
}) {
	const endMonth = to ? to.slice(0, 7) : currentMonth();
	const startMonth = shiftMonth(endMonth, -5);
	const query = useQuery(
		transactionQuery({
			account: "",
			category: "",
			type: "",
			from: monthRange(startMonth).from,
			to: monthRange(endMonth).to,
		}),
	);
	const months = monthlyTotals(query.data ?? [], endMonth);
	const maximum = Math.max(1, ...months.flatMap((item) => [item.income, item.expenses]));
	const [inspected, setInspected] = useState("");
	const detail = months.find((item) => item.month === inspected) ?? months[5];
	const label = (month: string) =>
		new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
			month: "short",
			year: "numeric",
		});
	return (
		<section className="panel income-expense-chart" aria-label="Income vs expenses">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">MONTHLY COMPARISON</p>
					<h3>Income vs expenses</h3>
					<p className="muted">
						{label(startMonth)} – {label(endMonth)}
					</p>
				</div>
				<div className="comparison-legend">
					<span className="income">● Income</span>
					<span className="expense">● Expenses</span>
				</div>
			</div>
			{query.isPending ? (
				<p role="status">Loading monthly totals…</p>
			) : query.isError ? (
				<p role="status">
					Could not load monthly totals.{" "}
					<button className="text-button" onClick={() => void query.refetch()}>
						Retry
					</button>
				</p>
			) : (
				<>
					<div className="comparison-detail" aria-live="polite">
						<strong>{label(detail.month)}</strong>
						<span className="income">Income {money(detail.income)}</span>
						<span className="expense">Expenses {money(detail.expenses)}</span>
					</div>
					<div className="comparison-plot">
						{months.map((item) => (
							<button
								key={item.month}
								type="button"
								className="comparison-month"
								aria-pressed={selectedMonth(from, to) === item.month}
								aria-label={`${label(item.month)}: income ${money(item.income)}, expenses ${money(item.expenses)}. Show this month`}
								onMouseEnter={() => setInspected(item.month)}
								onFocus={() => setInspected(item.month)}
								onClick={() => {
									setInspected(item.month);
									onMonthSelect(item.month);
								}}
							>
								<span className="comparison-bars" aria-hidden="true">
									<span
										className="comparison-income"
										style={{ height: `${(item.income / maximum) * 100}%` }}
									/>
									<span
										className="comparison-expense"
										style={{ height: `${(item.expenses / maximum) * 100}%` }}
									/>
								</span>
								<span className="comparison-month-label">{label(item.month)}</span>
							</button>
						))}
					</div>
					{maximum === 1 && months.every((item) => !item.income && !item.expenses) && (
						<p className="muted">No income or expenses in these six months.</p>
					)}
					<p className="comparison-hint">
						Select a month to view its activity. Transfers excluded.
					</p>
				</>
			)}
		</section>
	);
}
