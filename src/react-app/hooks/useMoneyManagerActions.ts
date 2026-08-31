import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
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
import { accountNameMaxLength, accountTypes, categoryNameMaxLength } from "../utils/constants";
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
	refreshAccounts: () => Promise<void>;
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
	refreshAccounts,
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
	const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
	const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

	function resetEntry() {
		setEditing(null);
		setEntry(blankEntry(filters.account));
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

	async function deleteTransaction(transaction: Transaction) {
		const label =
			transaction.counterparty?.trim() ||
			transaction.description?.trim() ||
			(transaction.type === "transfer" ? "This transfer" : "This transaction");
		if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
		try {
			await request<void>(`/transactions/${transaction.id}`, { method: "DELETE" });
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
	): Promise<boolean> {
		event.preventDefault();
		const name = draft.name.trim();
		if (!name) {
			setError("Account name is required.");
			return false;
		}
		if (name.length > accountNameMaxLength) {
			setError(`Account name must be ${accountNameMaxLength} characters or fewer.`);
			return false;
		}
		if (!accountTypes.some((type) => type === draft.type)) {
			setError("Choose a valid account type.");
			return false;
		}
		setSaving(true);
		try {
			const wasEditing = Boolean(editing);
			const payload = { name, type: draft.type };
			if (editing)
				await request<Account>(`/accounts/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify(payload),
				});
			else
				await request<Account>("/accounts", {
					method: "POST",
					body: JSON.stringify(payload),
				});
			setAccountDraft({ name: "", type: "cash" });
			setEditingAccount(null);
			setError("");
			setNotice(wasEditing ? "Account updated." : "Account added.");
			await refreshAccounts();
			return true;
		} catch (reason) {
			setError(errorMessage(reason, "Could not save account."));
			return false;
		} finally {
			setSaving(false);
		}
	}

	async function deleteAccount(account: Account) {
		if (
			!window.confirm(
				`Delete "${account.name}"? Accounts with transactions cannot be deleted.`,
			)
		)
			return;
		setDeletingAccountId(account.id);
		try {
			await request<void>(`/accounts/${account.id}`, { method: "DELETE" });
			setNotice("Account deleted.");
			await refreshAccounts();
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete account."));
		} finally {
			setDeletingAccountId(null);
		}
	}

	async function saveCategory(
		event: FormEvent<HTMLFormElement>,
		draft: CategoryDraft,
		editing: Category | null,
	): Promise<boolean> {
		event.preventDefault();
		const name = draft.name.trim();
		if (!name) {
			setError("Category name is required.");
			return false;
		}
		if (name.length > categoryNameMaxLength) {
			setError(`Category name must be ${categoryNameMaxLength} characters or fewer.`);
			return false;
		}
		setSaving(true);
		try {
			const wasEditing = Boolean(editing);
			if (editing)
				await request<Category>(`/categories/${editing.id}`, {
					method: "PATCH",
					body: JSON.stringify({ name }),
				});
			else
				await request<Category>("/categories", {
					method: "POST",
					body: JSON.stringify({ name, type: draft.type }),
				});
			setCategoryDraft({ name: "", type: "expense" });
			setEditingCategory(null);
			setError("");
			setNotice(wasEditing ? "Category renamed." : "Category added.");
			await refresh();
			return true;
		} catch (reason) {
			setError(errorMessage(reason, "Could not save category."));
			return false;
		} finally {
			setSaving(false);
		}
	}

	async function deleteCategory(category: Category) {
		if (
			!window.confirm(
				`Delete "${category.name}"? Categories used by expenses cannot be deleted.`,
			)
		)
			return;
		setDeletingCategoryId(category.id);
		try {
			await request<void>(`/categories/${category.id}`, { method: "DELETE" });
			setNotice("Category deleted.");
			await refresh();
		} catch (reason) {
			setError(errorMessage(reason, "Could not delete category."));
		} finally {
			setDeletingCategoryId(null);
		}
	}

	return {
		resetEntry,
		saveEntry,
		editTransaction,
		deleteTransaction,
		saveAccount,
		deleteAccount,
		deletingAccountId,
		saveCategory,
		deleteCategory,
		deletingCategoryId,
	};
}
