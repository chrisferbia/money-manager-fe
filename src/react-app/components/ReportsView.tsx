import type { MoneyFormatter, ReportItem } from "../types";

type ReportsViewProps = {
	report: ReportItem[];
	money: MoneyFormatter;
	fromDate: string;
	toDate: string;
	setFromDate: (value: string) => void;
	setToDate: (value: string) => void;
	onCategorySelect: (categoryId: number) => void;
};

export function ReportsView({
	report,
	money,
	fromDate,
	toDate,
	setFromDate,
	setToDate,
	onCategorySelect,
}: ReportsViewProps) {
	const largest = Math.max(...report.map((item) => item.total), 1);
	return (
		<>
			<section className="page-heading">
				<div>
					<p className="eyebrow">ANALYSIS</p>
					<h2>Expense report</h2>
					<p className="muted">See how expenses are distributed across categories.</p>
				</div>
			</section>
			<section className="panel report-panel">
				<div className="date-filters">
					<label>
						From
						<input
							type="date"
							value={fromDate}
							onChange={(event) => setFromDate(event.target.value)}
						/>
					</label>
					<label>
						To
						<input
							type="date"
							value={toDate}
							onChange={(event) => setToDate(event.target.value)}
						/>
					</label>
					<button
						className="cancel-button"
						onClick={() => {
							setFromDate("");
							setToDate("");
						}}
					>
						Clear dates
					</button>
				</div>
				{report.length ? (
					<div className="report-list">
						{report.map((item) => (
							<div
								className="report-row"
								key={item.id}
								role="button"
								tabIndex={0}
								aria-label={`View transactions for ${item.name}`}
								onClick={() => onCategorySelect(item.id)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onCategorySelect(item.id);
									}
								}}
							>
								<div>
									<strong>{item.name}</strong>
									<div className="progress-track">
										<div
											className="progress-fill"
											style={{ width: `${(item.total / largest) * 100}%` }}
										/>
									</div>
								</div>
								<b>{money(item.total)}</b>
							</div>
						))}
					</div>
				) : (
					<div className="empty-state">
						<strong>No matching expenses</strong>
						<span>Try a wider date range or add an expense.</span>
					</div>
				)}
			</section>
		</>
	);
}
