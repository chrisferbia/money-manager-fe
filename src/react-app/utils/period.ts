export function monthRange(value: string) {
	const [year, month] = value.split("-").map(Number);
	const lastDay = new Date(year, month, 0).getDate();
	return { from: `${value}-01`, to: `${value}-${lastDay}` };
}

export function currentMonth(now = new Date()) {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(value: string, offset: number) {
	const [year, month] = value.split("-").map(Number);
	return currentMonth(new Date(year, month - 1 + offset, 1));
}

export function selectedMonth(from: string, to: string) {
	if (!from) return "";
	const month = from.slice(0, 7);
	const range = monthRange(month);
	return from === range.from && to === range.to ? month : "";
}

export function periodLabel(from: string, to: string) {
	const month = selectedMonth(from, to);
	if (month)
		return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	if (!from && !to) return "All time";
	return `${from || "Beginning"} – ${to || "Today"}`;
}
