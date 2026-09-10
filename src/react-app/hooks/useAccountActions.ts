import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { request } from "../api/client";
import type { Account, AccountDraft } from "../types";
import type { ActionFeedback } from "./actionTypes";
import { errorMessage } from "../utils/errors";
import { accountNameMaxLength, accountTypes } from "../utils/constants";

export type AccountActionDependencies = ActionFeedback & {
	refreshAccounts: () => Promise<void>;
	setAccountDraft: Dispatch<SetStateAction<AccountDraft>>;
	setEditingAccount: Dispatch<SetStateAction<Account | null>>;
};

export function useAccountActions({
	refreshAccounts,
	setError,
	setNotice,
	setSaving,
	setAccountDraft,
	setEditingAccount,
}: AccountActionDependencies) {
	const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
	async function saveAccount(
		event: FormEvent<HTMLFormElement>,
		draft: AccountDraft,
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
		const sequence = Number(draft.sequence);
		if (editing && (!Number.isInteger(sequence) || sequence < 1)) {
			setError("Display order must be a positive whole number.");
			return false;
		}
		setSaving(true);
		try {
			const wasEditing = Boolean(editing);
			const payload = editing
				? { name, type: draft.type, sequence }
				: { name, type: draft.type };
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
			setAccountDraft({ name: "", type: "cash", sequence: "" });
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

	return { saveAccount, deleteAccount, deletingAccountId };
}
