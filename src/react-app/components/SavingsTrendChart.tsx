import { useState } from "react";
import type { MoneyFormatter, SavingsHistoryReport } from "../types";

type SavingsTrendChartProps = {
	report: SavingsHistoryReport;
	money: MoneyFormatter;
};

const chartWidth = 720;
const chartHeight = 230;
const chartPadding = { top: 18, right: 18, bottom: 34, left: 18 };

function monthLabel(month: string, includeYear = false) {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		...(includeYear ? { year: "numeric" as const } : {}),
		timeZone: "UTC",
	}).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function SavingsTrendChart({ report, money }: SavingsTrendChartProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	if (report.account_count === 0)
		return (
			<section className="panel savings-trend-panel">
				<div className="empty-state">
					<strong>No savings accounts yet</strong>
					<span>
						Create an account with the savings type to start tracking this trend.
					</span>
				</div>
			</section>
		);

	const points = report.months;
	const balances = points.map((point) => point.balance);
	const rawMin = Math.min(...balances);
	const rawMax = Math.max(...balances);
	const spread = rawMax - rawMin;
	const padding = spread > 0 ? spread * 0.12 : Math.max(Math.abs(rawMax) * 0.1, 1);
	const min = rawMin - padding;
	const max = rawMax + padding;
	const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
	const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
	const x = (index: number) =>
		chartPadding.left +
		(points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
	const y = (value: number) => chartPadding.top + ((max - value) / (max - min)) * plotHeight;
	const coordinates = points.map((point, index) => `${x(index)},${y(point.balance)}`).join(" ");
	const areaPath = points.length
		? `M ${x(0)} ${chartPadding.top + plotHeight} L ${coordinates.replace(/,/g, " ")} L ${x(points.length - 1)} ${chartPadding.top + plotHeight} Z`
		: "";
	const currentBalance = points[points.length - 1]?.balance ?? 0;
	const periodChange = currentBalance - (points[0]?.balance ?? 0);
	const firstMonth = points[0]?.month;
	const lastMonth = points[points.length - 1]?.month;
	const activeIndex = hoveredIndex ?? selectedIndex;
	const lastIndex = points.length - 1;
	const lastPointX = x(lastIndex);
	const lastPointY = y(currentBalance);
	const activePoint = activeIndex === null ? null : points[activeIndex];
	const activeX = activeIndex === null ? 0 : x(activeIndex);
	const activeY = activePoint ? y(activePoint.balance) : 0;
	const tooltipWidth = 172;
	const tooltipHeight = 52;
	const tooltipX = Math.min(
		Math.max(activeX - tooltipWidth / 2, 4),
		chartWidth - tooltipWidth - 4,
	);
	const tooltipY =
		activeY < chartPadding.top + tooltipHeight + 14
			? activeY + 13
			: activeY - tooltipHeight - 12;

	return (
		<section className="panel savings-trend-panel">
			<div className="panel-heading savings-trend-heading">
				<div>
					<p className="eyebrow">SAVINGS</p>
					<h3>Combined savings balance</h3>
					<p className="muted">
						Monthly total across {report.account_count} savings account
						{report.account_count === 1 ? "" : "s"}. Current month is to date.
					</p>
				</div>
				<div className="savings-total">
					<strong>{money(currentBalance)}</strong>
					<span
						className={
							periodChange > 0 ? "positive" : periodChange < 0 ? "negative" : ""
						}
					>
						{periodChange > 0 ? "+" : ""}
						{money(periodChange)} over the period
					</span>
				</div>
			</div>
			{points.length > 0 && (
				<figure className="savings-chart">
					<svg
						viewBox={`0 0 ${chartWidth} ${chartHeight}`}
						role="img"
						aria-label={`Combined savings balance from ${monthLabel(firstMonth, true)} to ${monthLabel(lastMonth, true)}`}
					>
						{[0, 0.5, 1].map((ratio) => {
							const lineY = chartPadding.top + ratio * plotHeight;
							return (
								<line
									key={ratio}
									x1={chartPadding.left}
									x2={chartWidth - chartPadding.right}
									y1={lineY}
									y2={lineY}
									className="savings-grid-line"
								/>
							);
						})}
						<path d={areaPath} className="savings-chart-area" />
						<polyline points={coordinates} className="savings-chart-line" />
						{points.map((point, index) => (
							<g
								key={point.month}
								className="savings-chart-point-target"
								role="button"
								tabIndex={0}
								aria-label={`${monthLabel(point.month, true)}: ${money(point.balance)}, ${point.change >= 0 ? "+" : ""}${money(point.change)} this month`}
								onMouseEnter={() => setHoveredIndex(index)}
								onMouseLeave={() => setHoveredIndex(null)}
								onFocus={() => setHoveredIndex(index)}
								onBlur={() => setHoveredIndex(null)}
								onClick={() =>
									setSelectedIndex((current) =>
										current === index ? null : index,
									)
								}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										setSelectedIndex((current) =>
											current === index ? null : index,
										);
									}
								}}
							>
								<circle
									cx={x(index)}
									cy={y(point.balance)}
									r="14"
									className="savings-chart-hit-area"
								/>
								<circle
									cx={x(index)}
									cy={y(point.balance)}
									r={activeIndex === index ? 5 : 4}
									className={`savings-chart-point${activeIndex === index ? " active" : ""}`}
								/>
								<title>{`${monthLabel(point.month, true)}: ${money(point.balance)}`}</title>
							</g>
						))}
						<g className="savings-latest-label" aria-hidden="true">
							<text
								x={lastPointX - 8}
								y={Math.max(lastPointY - 10, 12)}
								textAnchor="end"
							>
								{money(currentBalance)}
							</text>
						</g>
						{activePoint && (
							<g className="savings-chart-tooltip" aria-hidden="true">
								<rect
									x={tooltipX}
									y={tooltipY}
									width={tooltipWidth}
									height={tooltipHeight}
									rx="7"
								/>
								<text x={tooltipX + 10} y={tooltipY + 17} className="tooltip-month">
									{monthLabel(activePoint.month, true)}
								</text>
								<text
									x={tooltipX + 10}
									y={tooltipY + 33}
									className="tooltip-balance"
								>
									{money(activePoint.balance)} total
								</text>
								<text
									x={tooltipX + 10}
									y={tooltipY + 46}
									className={
										activePoint.change >= 0
											? "tooltip-positive"
											: "tooltip-negative"
									}
								>
									{activePoint.change > 0 ? "+" : ""}
									{money(activePoint.change)} this month
								</text>
							</g>
						)}
						{points.map((point, index) =>
							index % 2 === 0 || index === points.length - 1 ? (
								<text
									key={point.month}
									x={x(index)}
									y={chartHeight - 9}
									textAnchor="middle"
									className="savings-chart-label"
								>
									{monthLabel(point.month)}
								</text>
							) : null,
						)}
					</svg>
					<figcaption>
						{monthLabel(firstMonth, true)}–{monthLabel(lastMonth, true)} monthly
						balances
					</figcaption>
				</figure>
			)}
			<div
				className="savings-month-changes"
				role="list"
				aria-label="Monthly savings balances"
			>
				{points.map((point) => (
					<div className="savings-month-change" role="listitem" key={point.month}>
						<span>{monthLabel(point.month)}</span>
						<strong>{money(point.balance)}</strong>
						<small
							className={
								point.change > 0 ? "positive" : point.change < 0 ? "negative" : ""
							}
						>
							{point.change > 0 ? "+" : ""}
							{money(point.change)} this month
						</small>
					</div>
				))}
			</div>
		</section>
	);
}
