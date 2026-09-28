import type { MoneyFormatter, ReportItem, SavingsHistoryReport } from "../types";
import { shiftMonth } from "../utils/period";
import { SavingsTrendChart } from "./SavingsTrendChart";

type ReportsViewProps = {
	report: ReportItem[];
	previousReport: ReportItem[];
	reportMonth: string;
	savingsHistory: SavingsHistoryReport;
	money: MoneyFormatter;
	onCategorySelect: (categoryId: number) => void;
};

function monthLabel(month: string) {
	return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
	});
}

export function ReportsView({
	report,
	previousReport,
	reportMonth,
	savingsHistory,
	money,
	onCategorySelect,
}: ReportsViewProps) {
	const previousById = new Map(previousReport.map((item) => [item.id, item]));
	const currentIds = new Set(report.map((item) => item.id));
	const comparison = [
		...report.map((item) => ({
			id: item.id,
			name: item.name,
			current: item.total,
			previous: previousById.get(item.id)?.total ?? 0,
		})),
		...previousReport
			.filter((item) => !currentIds.has(item.id))
			.map((item) => ({ id: item.id, name: item.name, current: 0, previous: item.total })),
	];
	const largest = Math.max(...comparison.flatMap((item) => [item.current, item.previous]), 1);
	const currentLabel = reportMonth ? monthLabel(reportMonth) : "Selected period";
	const previousLabel = reportMonth ? monthLabel(shiftMonth(reportMonth, -1)) : "Previous month";
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
									<i className="report-legend-previous" /> {previousLabel}
								</span>
							</div>
						) : (
							<p className="muted report-comparison-note">
								Choose Monthly to compare with the previous month.
							</p>
						)}
					</div>
				</div>
				{comparison.length ? (
					<div className="report-list">
						{comparison.map((item) => {
							const difference = item.current - item.previous;
							const direction =
								difference > 0 ? "increase" : difference < 0 ? "decrease" : "flat";
							const differenceLabel =
								difference > 0
									? `Increased by ${money(difference)}`
									: difference < 0
										? `Decreased by ${money(Math.abs(difference))}`
										: "No change";
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
											? `${currentLabel} ${money(item.current)}, ${previousLabel} ${money(item.previous)}. ${differenceLabel}.`
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
											{hasMonthComparison && (
												<div className="progress-track report-previous-track">
													<div
														className="progress-fill report-previous-fill"
														style={{
															width: `${(item.previous / largest) * 100}%`,
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
												<span>{money(item.previous)} last month</span>
												<small className={direction}>
													{difference > 0
														? "↑"
														: difference < 0
															? "↓"
															: "—"}{" "}
													{differenceLabel}
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
		</>
	);
}
