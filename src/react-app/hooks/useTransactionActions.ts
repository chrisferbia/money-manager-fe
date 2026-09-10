import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { request } from "../api/client";
import type { Account, DashboardFilters, EntryForm, Transaction, View } from "../types";
import type { ActionFeedback } from "./actionTypes";
import { errorMessage } from "../utils/errors";
import { blankEntry } from "../utils/forms";
import {
	createTransactionPayload,
	createTransferPayload,
	entryFromTransaction,
	updateTransactionPayload,
	validateEntry,
} from "../utils/transactions";

export type TransactionActionDependencies = ActionFeedback & {
	accounts: Account[];
	filters: DashboardFilters;
	refreshTransactions: () => Promise<void>;
	setView: Dispatch<SetStateAction<View>>;
};

export function useTransactionActions({
	accounts,
	filters,
	refreshTransactions,
	setError,
	setNotice,
	setView,
}: TransactionActionDependencies) {
	const [entry, setEntry] = useState<EntryForm>(() => blankEntry());
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [transactionSaving, setSaving] = useState(false);
	function resetEntry() {
		setEditing(null);
		setEntry(blankEntry(filters.account || String(accounts[0]?.id ?? "")));
	}

	async function saveEntry(
		event: FormEvent<HTMLFormElement>,
		draft: EntryForm = entry,
		selected: Transaction | null = editing,
	): Promise<boolean> {
		event.preventDefault();
		const validationError = validateEntry(draft);
		if (validationError) {
			setError(validationError);
			return false;
		}
		setSaving(true);
		try {
			if (selected)
				await request<Transaction>(`/transactions/${selected.id}`, {
					method: "PATCH",
					body: JSON.stringify(updateTransactionPayload(draft)),
				});
			else if (draft.type === "transfer")
				await request<Transaction>("/transfers", {
					method: "POST",
					body: JSON.stringify(createTransferPayload(draft)),
				});
			else
				await request<Transaction>("/transactions", {
					method: "POST",
					body: JSON.stringify(createTransactionPayload(draft)),
				});

			const wasEditing = Boolean(selected);
			resetEntry();
			setError("");
			setNotice(wasEditing ? "Transaction updated." : "Transaction added.");
			// Transactions change balances, so reload the cached accounts too.
			await refreshTransactions();
			return true;
		} catch (reason) {
			setError(errorMessage(reason, "Could not save transaction."));
			return false;
		} finally {
			setSaving(false);
		}
	}

	function editTransaction(transaction: Transaction) {
		setEditing(transaction);
		setEntry(entryFromTransaction(transaction));
		setView("transactions");
	}

	async function deleteTransaction(transaction: Transaction): Promise<boolean> {
		const label =
			transaction.counterparty?.trim() ||
			transaction.description?.trim() ||
			(transaction.type === "transfer" ? "This transfer" : "This transaction");
		if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return false;
		try {
			await request<void>(`/transactions/${transaction.id}`, { method: "DELETE" });
			setNotice("Transaction deleted.");
			await refreshTransactions();
			return true;
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete transaction."));
			return false;
		}
	}

	return {
		entry,
		setEntry,
		editing,
		transactionSaving,
		resetEntry,
		saveEntry,
		editTransaction,
		deleteTransaction,
	};
}
