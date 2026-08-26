import type { Dispatch, FormEvent, SetStateAction } from "react";
import { request } from "../api/client";
import type {
	Account,
	Category,
	CategoryDraft,
	DashboardFilters,
	EntryForm,
	Transaction,
	View,
} from "../types";
import { errorMessage } from "../utils/errors";
import { blankEntry } from "../utils/forms";
import {
	createTransactionPayload,
	createTransferPayload,
	entryFromTransaction,
	updateTransactionPayload,
	validateEntry,
} from "../utils/transactions";

type ActionDependencies = {
	filters: DashboardFilters;
	refresh: () => Promise<void>;
	setError: (message: string) => void;
	setNotice: (message: string) => void;
	setSaving: Dispatch<SetStateAction<boolean>>;
	setView: Dispatch<SetStateAction<View>>;
	setEntry: Dispatch<SetStateAction<EntryForm>>;
	setEditing: Dispatch<SetStateAction<Transaction | null>>;
	setAccountDraft: Dispatch<SetStateAction<{ name: string; type: string }>>;
	setEditingAccount: Dispatch<SetStateAction<Account | null>>;
	setCategoryDraft: Dispatch<SetStateAction<CategoryDraft>>;
	setEditingCategory: Dispatch<SetStateAction<Category | null>>;
};

export function useMoneyManagerActions({
	filters,
	refresh,
	setError,
	setNotice,
	setSaving,
	setView,
	setEntry,
	setEditing,
	setAccountDraft,
	setEditingAccount,
	setCategoryDraft,
	setEditingCategory,
}: ActionDependencies) {
	function resetEntry() {
		setEditing(null);
		setEntry(blankEntry(filters.account));
	}

	async function saveEntry(
		event: FormEvent<HTMLFormElement>,
		entry: EntryForm,
		editing: Transaction | null,
	) {
		event.preventDefault();
		const validationError = validateEntry(entry);
		if (validationError) return setError(validationError);
		setSaving(true);
		try {
			if (editing)
				await request<Transaction>(`/transactions/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify(updateTransactionPayload(entry, editing.type)),
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
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not save transaction."));
		} finally {
			setSaving(false);
		}
	}

	function editTransaction(transaction: Transaction) {
		setEditing(transaction);
		setEntry(entryFromTransaction(transaction));
		setView("transactions");
	}

	async function deleteTransaction(id: number) {
		if (!window.confirm("Delete this transaction?")) return;
		try {
			await request<void>(`/transactions/${id}`, { method: "DELETE" });
			setNotice("Transaction deleted.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete transaction."));
		}
	}

	async function saveAccount(
		event: FormEvent<HTMLFormElement>,
		draft: { name: string; type: string },
		editing: Account | null,
	) {
		event.preventDefault();
		if (!draft.name.trim()) return setError("Account name is required.");
		setSaving(true);
		try {
			const wasEditing = Boolean(editing);
			if (editing)
				await request<Account>(`/accounts/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify(draft),
				});
			else
				await request<Account>("/accounts", {
					method: "POST",
					body: JSON.stringify(draft),
				});
			setAccountDraft({ name: "", type: "cash" });
			setEditingAccount(null);
			setError("");
			setNotice(wasEditing ? "Account updated." : "Account added.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not save account."));
		} finally {
			setSaving(false);
		}
	}

	async function deleteAccount(id: number) {
		if (!window.confirm("Delete this account? Accounts with transactions cannot be deleted."))
			return;
		try {
			await request<void>(`/accounts/${id}`, { method: "DELETE" });
			setNotice("Account deleted.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete account."));
		}
	}

	async function saveCategory(
		event: FormEvent<HTMLFormElement>,
		draft: CategoryDraft,
		editing: Category | null,
	) {
		event.preventDefault();
		if (!draft.name.trim()) return setError("Category name is required.");
		setSaving(true);
		try {
			const wasEditing = Boolean(editing);
			if (editing)
				await request<Category>(`/categories/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify({ name: draft.name.trim() }),
				});
			else
				await request<Category>("/categories", {
					method: "POST",
					body: JSON.stringify(draft),
				});
			setCategoryDraft({ name: "", type: "expense" });
			setEditingCategory(null);
			setError("");
			setNotice(wasEditing ? "Category renamed." : "Category added.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not save category."));
		} finally {
			setSaving(false);
		}
	}

	async function deleteCategory(id: number) {
		if (!window.confirm("Delete this category? Categories used by expenses cannot be deleted."))
			return;
		try {
			await request<void>(`/categories/${id}`, { method: "DELETE" });
			setNotice("Category deleted.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete category."));
		}
	}

	return {
		resetEntry,
		saveEntry,
		editTransaction,
		deleteTransaction,
		saveAccount,
		deleteAccount,
		saveCategory,
		deleteCategory,
	};
}
