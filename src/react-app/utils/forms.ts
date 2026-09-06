import type { EntryForm } from "../types";

function pad(value: number) {
	return String(value).padStart(2, "0");
}

export function currentLocalDateTime() {
	const now = new Date();
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function blankEntry(accountId = ""): EntryForm {
	return {
		type: "expense",
		accountId,
		destinationId: "",
		categoryId: "",
		amount: "",
		counterparty: "",
		description: "",
		date: currentLocalDateTime(),
	};
}
