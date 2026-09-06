import type { EntryForm, Transaction } from "../types";

export function validateEntry(entry: EntryForm): string | null {
	const amount = Math.round(Number(entry.amount));
	const occurredAt = new Date(entry.date);
	if (
		!entry.accountId ||
		!Number.isFinite(amount) ||
		amount <= 0 ||
		!entry.date ||
		Number.isNaN(occurredAt.getTime())
	)
		return "Account, date and time, and a positive amount are required.";
	if (entry.type === "expense" && !entry.categoryId)
		return "Expense transactions require a category.";
	if (
		entry.type === "transfer" &&
		(!entry.destinationId || entry.destinationId === entry.accountId)
	)
		return "Choose a different destination account for the transfer.";
	return null;
}

export function amountInIdr(entry: EntryForm) {
	return Math.round(Number(entry.amount));
}

export function commonTransactionPayload(entry: EntryForm) {
	return {
		amount: amountInIdr(entry),
		counterparty: entry.counterparty.trim() || null,
		description: entry.description.trim() || null,
		occurred_at: new Date(entry.date).toISOString(),
	};
}

export function createTransactionPayload(entry: EntryForm) {
	return {
		type: entry.type,
		account_id: Number(entry.accountId),
		category_id:
			entry.type !== "transfer" && entry.categoryId ? Number(entry.categoryId) : null,
		...commonTransactionPayload(entry),
	};
}

export function createTransferPayload(entry: EntryForm) {
	return {
		type: "transfer" as const,
		account_id: Number(entry.accountId),
		related_account_id: Number(entry.destinationId),
		...commonTransactionPayload(entry),
	};
}

export function updateTransactionPayload(entry: EntryForm) {
	return {
		type: entry.type,
		related_account_id:
			entry.type === "transfer" && entry.destinationId ? Number(entry.destinationId) : null,
		...commonTransactionPayload(entry),
		...(entry.type === "expense" || entry.type === "income"
			? { category_id: entry.categoryId ? Number(entry.categoryId) : null }
			: { category_id: null }),
	};
}

export function sortTransactions(transactions: Transaction[]) {
	return [...transactions].sort(
		(left, right) =>
			Date.parse(right.occurred_at) - Date.parse(left.occurred_at) ||
			Date.parse(right.created_at) - Date.parse(left.created_at),
	);
}

export function entryFromTransaction(transaction: Transaction): EntryForm {
	const occurredAt = new Date(transaction.occurred_at);
	const pad = (value: number) => String(value).padStart(2, "0");
	const localDateTime = `${occurredAt.getFullYear()}-${pad(occurredAt.getMonth() + 1)}-${pad(occurredAt.getDate())}T${pad(occurredAt.getHours())}:${pad(occurredAt.getMinutes())}`;

	return {
		type: transaction.type,
		accountId: String(transaction.account_id),
		destinationId: transaction.related_account_id ? String(transaction.related_account_id) : "",
		categoryId: transaction.category_id ? String(transaction.category_id) : "",
		amount: String(transaction.amount),
		counterparty: transaction.counterparty ?? "",
		description: transaction.description ?? "",
		date: localDateTime,
	};
}
