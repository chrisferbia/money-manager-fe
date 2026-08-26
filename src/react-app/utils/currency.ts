import type { DisplayCurrency, MoneyFormatter } from "../types";

const STORAGE_KEY = "money-manager-display-currency";

export function readCurrency(): DisplayCurrency {
	try {
		return window.localStorage.getItem(STORAGE_KEY) === "USD" ? "USD" : "IDR";
	} catch {
		return "IDR";
	}
}

export function persistCurrency(currency: DisplayCurrency) {
	try {
		window.localStorage.setItem(STORAGE_KEY, currency);
	} catch {
		// Preferences remain usable when browser storage is unavailable.
	}
}

export function createMoneyFormatter(currency: DisplayCurrency): MoneyFormatter {
	const formatter =
		currency === "IDR"
			? new Intl.NumberFormat("id-ID", {
					style: "currency",
					currency: "IDR",
					maximumFractionDigits: 0,
				})
			: new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
					maximumFractionDigits: 0,
				});
	return (amount) => formatter.format(amount);
}
