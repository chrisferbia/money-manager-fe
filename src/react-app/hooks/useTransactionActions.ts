import type { Dispatch, FormEvent, SetStateAction } from "react";
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
	setEntry: Dispatch<SetStateAction<EntryForm>>;
	setEditing: Dispatch<SetStateAction<Transaction | null>>;
};

export function useTransactionActions({
	accounts,
	filters,
	refreshTransactions,
	setError,
	setNotice,
	setSaving,
	setView,
	setEntry,
	setEditing,
}: TransactionActionDependencies) {
	function resetEntry() {
		setEditing(null);
		setEntry(blankEntry(filters.account || String(accounts[0]?.id ?? "")));
	}

	async function saveEntry(
		event: FormEvent<HTMLFormElement>,
		entry: EntryForm,
		editing: Transaction | null,
	): Promise<boolean> {
		event.preventDefault();
		const validationError = validateEntry(entry);
		if (validationError) {
			setError(validationError);
			return false;
		}
		setSaving(true);
		try {
			if (editing)
				await request<Transaction>(`/transactions/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify(updateTransactionPayload(entry)),
				});
			else if (entry.type === "transfer")
				await request<Transaction>("/transfers", {
					method: "POST",
					body: JSON.stringify(createTransferPayload(entry)),
				});
			else
				await request<Transaction>("/transactions", {
					method: "POST",
					body: JSON.stringify(createTransactionPayload(entry)),
				});

			const wasEditing = Boolean(editing);
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

	return { resetEntry, saveEntry, editTransaction, deleteTransaction };
}
