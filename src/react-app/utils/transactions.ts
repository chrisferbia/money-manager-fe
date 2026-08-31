import type { EntryForm, Transaction } from "../types";

export function validateEntry(entry: EntryForm): string | null {
	const amount = Math.round(Number(entry.amount));
	if (!entry.accountId || !Number.isFinite(amount) || amount <= 0 || !entry.date)
		return "Account, date, and a positive amount are required.";
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
		occurred_at: `${entry.date}T12:00:00Z`,
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

export function updateTransactionPayload(entry: EntryForm, type: Transaction["type"]) {
	return {
		...commonTransactionPayload(entry),
		...(type === "expense" || type === "income"
			? { category_id: entry.categoryId ? Number(entry.categoryId) : null }
			: {}),
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
	return {
		type: transaction.type,
		accountId: String(transaction.account_id),
		destinationId: transaction.related_account_id ? String(transaction.related_account_id) : "",
		categoryId: transaction.category_id ? String(transaction.category_id) : "",
		amount: String(transaction.amount),
		counterparty: transaction.counterparty ?? "",
		description: transaction.description ?? "",
		date: transaction.occurred_at.slice(0, 10),
	};
}
