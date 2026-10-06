import { useState } from "react";
import type { Account, Category, MoneyFormatter, ReportItem, SavingsHistoryReport } from "../types";
import { ReceivablesReport } from "./ReceivablesReport";
import { shiftMonth } from "../utils/period";
import { SavingsTrendChart } from "./SavingsTrendChart";

type ComparisonMode = "lastMonth" | "budget";

type ReportsViewProps = {
	accounts?: Account[];
	report: ReportItem[];
	previousReport: ReportItem[];
	reportMonth: string;
	categories: Category[];
	savingsHistory: SavingsHistoryReport;
	money: MoneyFormatter;
	onCategorySelect: (categoryId: number) => void;
};

type CategoryComparison = {
	id: number;
	name: string;
	current: number;
	reference: number | null;
};

function monthLabel(month: string) {
	return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
	});
}

export function ReportsView({
	accounts = [],
	report,
	previousReport,
	reportMonth,
	categories,
	savingsHistory,
	money,
	onCategorySelect,
}: ReportsViewProps) {
	const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("lastMonth");
	const previousById = new Map(previousReport.map((item) => [item.id, item]));
	const categoryById = new Map(categories.map((item) => [item.id, item]));
	const currentIds = new Set(report.map((item) => item.id));
	const comparison: CategoryComparison[] =
		comparisonMode === "lastMonth"
			? [
					...report.map((item) => ({
						id: item.id,
						name: item.name,
						current: item.total,
						reference: previousById.get(item.id)?.total ?? 0,
					})),
					...previousReport
						.filter((item) => !currentIds.has(item.id))
						.map((item) => ({
							id: item.id,
							name: item.name,
							current: 0,
							reference: item.total,
						})),
				]
			: [
					...report.map((item) => ({
						id: item.id,
						name: item.name,
						current: item.total,
						reference: categoryById.get(item.id)?.monthly_budget ?? null,
					})),
					...categories
						.filter(
							(item) =>
								item.type === "expense" &&
								item.monthly_budget != null &&
								!currentIds.has(item.id),
						)
						.map((item) => ({
							id: item.id,
							name: item.name,
							current: 0,
							reference: item.monthly_budget ?? null,
						})),
				];
	const largest = Math.max(
		...comparison.flatMap((item) => [item.current, item.reference ?? 0]),
		1,
	);
	const currentLabel = reportMonth ? monthLabel(reportMonth) : "Selected period";
	const previousLabel = reportMonth ? monthLabel(shiftMonth(reportMonth, -1)) : "Previous month";
	const referenceLabel = comparisonMode === "lastMonth" ? previousLabel : "Monthly budget";
	const hasMonthComparison = Boolean(reportMonth);

	return (
		<>
			<section className="page-heading">
				<div>
					<p className="eyebrow">ANALYSIS</p>
					<h2>Reports</h2>
					<p className="muted">Track your savings trend and understand your spending.</p>
				</div>
			</section>
			<section className="panel report-panel">
				<div className="panel-heading report-section-heading">
					<div>
						<p className="eyebrow">SPENDING</p>
						<h3>Expenses by category</h3>
						{hasMonthComparison ? (
							<div className="report-comparison-legend" aria-label="Chart legend">
								<span>
									<i className="report-legend-current" /> {currentLabel}
								</span>
								<span>
									<i className="report-legend-previous" /> {referenceLabel}
								</span>
							</div>
						) : (
							<p className="muted report-comparison-note">
								Choose Monthly to compare with last month or a budget.
							</p>
						)}
					</div>
					<div className="report-compare-control">
						<span>Compare with</span>
						<div role="group" aria-label="Compare expenses with">
							<button
								type="button"
								className={comparisonMode === "lastMonth" ? "selected" : ""}
								aria-pressed={comparisonMode === "lastMonth"}
								onClick={() => setComparisonMode("lastMonth")}
							>
								Last month
							</button>
							<button
								type="button"
								className={comparisonMode === "budget" ? "selected" : ""}
								aria-pressed={comparisonMode === "budget"}
								onClick={() => setComparisonMode("budget")}
							>
								Budget
							</button>
						</div>
					</div>
				</div>
				{comparison.length ? (
					<div className="report-list">
						{comparison.map((item) => {
							const difference =
								item.reference === null ? null : item.current - item.reference;
							const direction =
								difference === null
									? "no-budget"
									: difference > 0
										? "increase"
										: difference < 0
											? "decrease"
											: "flat";
							const differenceLabel =
								comparisonMode === "budget"
									? difference === null
										? "No budget set"
										: difference > 0
											? `Over budget by ${money(difference)}`
											: difference < 0
												? `${money(Math.abs(difference))} remaining`
												: "Budget reached"
									: difference! > 0
										? `Increased by ${money(difference!)}`
										: difference! < 0
											? `Decreased by ${money(Math.abs(difference!))}`
											: "No change";
							const referenceAmount =
								item.reference === null ? "No budget" : money(item.reference);
							return (
								<div
									className="report-row report-comparison-row"
									key={item.id}
									role="button"
									tabIndex={0}
									aria-label={`View transactions for ${item.name}`}
									aria-describedby={`report-category-${item.id}-comparison`}
									onClick={() => onCategorySelect(item.id)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onCategorySelect(item.id);
										}
									}}
								>
									<span
										className="sr-only"
										id={`report-category-${item.id}-comparison`}
									>
										{hasMonthComparison
											? `${currentLabel} ${money(item.current)}, ${referenceLabel} ${referenceAmount}. ${differenceLabel}.`
											: `${currentLabel} ${money(item.current)}.`}
									</span>
									<div className="report-category-comparison">
										<strong>{item.name}</strong>
										<div className="report-paired-bars" aria-hidden="true">
											<div className="progress-track report-current-track">
												<div
													className="progress-fill report-current-fill"
													style={{
														width: `${(item.current / largest) * 100}%`,
													}}
												/>
											</div>
											{hasMonthComparison && item.reference !== null && (
												<div className="progress-track report-previous-track">
													<div
														className="progress-fill report-previous-fill"
														style={{
															width: `${(item.reference / largest) * 100}%`,
														}}
													/>
												</div>
											)}
										</div>
									</div>
									<div className="report-comparison-values">
										<b>{money(item.current)}</b>
										{hasMonthComparison && (
											<>
												<span>
													{comparisonMode === "budget"
														? item.reference === null
															? "No budget set"
															: `${money(item.reference)} budget`
														: `${money(item.reference ?? 0)} last month`}
												</span>
												<small className={direction}>
													{direction === "increase"
														? "↑"
														: direction === "decrease"
															? "↓"
															: direction === "flat"
																? "—"
																: ""}{" "}
													{direction === "no-budget"
														? "Set in Settings"
														: differenceLabel}
												</small>
											</>
										)}
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="empty-state">
						<strong>No matching expenses</strong>
						<span>Try a wider date range or add an expense.</span>
					</div>
				)}
			</section>
			<SavingsTrendChart report={savingsHistory} money={money} />
			<ReceivablesReport accounts={accounts} money={money} />
		</>
	);
}
