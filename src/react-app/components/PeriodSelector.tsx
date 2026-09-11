import { useState } from "react";
import { currentMonth, monthRange, selectedMonth, shiftMonth } from "../utils/period";

type Props = {
	from: string;
	to: string;
	onChange: (range: { from: string; to: string }) => void;
};

export function PeriodSelector({ from, to, onChange }: Props) {
	const [custom, setCustom] = useState(false);
	const month = selectedMonth(from, to);
	const mode = custom ? "custom" : month ? "month" : !from && !to ? "all" : "custom";
	const chooseMonth = (value: string) => {
		if (!/^\d{4}-\d{2}$/.test(value)) return;
		setCustom(false);
		onChange(monthRange(value));
	};
	return (
		<section className="period-selector" aria-label="Selected period">
			<select
				aria-label="Period mode"
				value={mode}
				onChange={(event) => {
					setCustom(event.target.value === "custom");
					if (event.target.value === "month") chooseMonth(month || currentMonth());
					if (event.target.value === "all") onChange({ from: "", to: "" });
				}}
			>
				<option value="month">Monthly</option>
				<option value="all">All time</option>
				<option value="custom">Custom dates</option>
			</select>
			{mode === "month" && (
				<div className="month-navigation">
					<button
						type="button"
						aria-label="Previous month"
						onClick={() => chooseMonth(shiftMonth(month, -1))}
					>
						←
					</button>
					<input
						type="month"
						aria-label="Selected month"
						value={month}
						onChange={(event) => chooseMonth(event.target.value)}
					/>
					<button
						type="button"
						aria-label="Next month"
						onClick={() => chooseMonth(shiftMonth(month, 1))}
					>
						→
					</button>
				</div>
			)}
			{mode === "custom" && (
				<div className="period-custom-dates">
					<label>
						From{" "}
						<input
							type="date"
							aria-label="Period from"
							value={from}
							max={to || undefined}
							onChange={(event) =>
								onChange({
									from: event.target.value,
									to: to && event.target.value > to ? event.target.value : to,
								})
							}
						/>
					</label>
					<label>
						To{" "}
						<input
							type="date"
							aria-label="Period to"
							value={to}
							min={from || undefined}
							onChange={(event) =>
								onChange({
									from:
										from && event.target.value && event.target.value < from
											? event.target.value
											: from,
									to: event.target.value,
								})
							}
						/>
					</label>
				</div>
			)}
			<button
				className="text-button"
				type="button"
				onClick={() => chooseMonth(currentMonth())}
			>
				This month
			</button>
		</section>
	);
}
