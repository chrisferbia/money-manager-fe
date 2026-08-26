import type { EntryForm } from "../types";

export const today = () => new Date().toISOString().slice(0, 10);

export function blankEntry(accountId = ""): EntryForm {
	return {
		type: "expense",
		accountId,
		destinationId: "",
		categoryId: "",
		amount: "",
		description: "",
		date: today(),
	};
}
