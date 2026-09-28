import { useState, type FormEvent } from "react";
import { request } from "../api/client";
import type { Account, AccountDraft } from "../types";
import type { ActionFeedback } from "./actionTypes";
import { errorMessage } from "../utils/errors";
import { accountNameMaxLength, accountTypes } from "../utils/constants";

export type AccountActionDependencies = ActionFeedback & {
	refreshAccounts: () => Promise<void>;
};

export function useAccountActions({
	refreshAccounts,
	setError,
	setNotice,
}: AccountActionDependencies) {
	const [accountDraft, setAccountDraft] = useState<AccountDraft>({
		name: "",
		type: "cash",
		sequence: "",
		valuationMode: "ledger",
	});
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [accountSaving, setSaving] = useState(false);
	const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
	async function saveAccount(
		event: FormEvent<HTMLFormElement>,
		draft: AccountDraft = accountDraft,
		editing: Account | null = editingAccount,
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
		if (draft.valuationMode === "crypto" && draft.type !== "investment") {
			setError("Crypto tracking requires an Investment account.");
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
			const replacingLedger =
				Boolean(editing) &&
				editing?.valuation_mode !== "crypto" &&
				draft.valuationMode === "crypto" &&
				Boolean(editing?.balance);
			if (
				replacingLedger &&
				!window.confirm(
					`Switch "${editing?.name}" to crypto value? Its current transaction balance of Rp ${new Intl.NumberFormat("id-ID").format(editing?.balance ?? 0)} will no longer be included. The new balance will come only from holdings.`,
				)
			)
				return false;
			const payload = editing
				? {
						name,
						type: draft.type,
						sequence,
						valuation_mode: draft.valuationMode,
						confirm_ledger_replacement: replacingLedger,
					}
				: { name, type: draft.type, valuation_mode: draft.valuationMode };
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
			setAccountDraft({ name: "", type: "cash", sequence: "", valuationMode: "ledger" });
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

	return {
		accountDraft,
		setAccountDraft,
		editingAccount,
		setEditingAccount,
		accountSaving,
		saveAccount,
		deleteAccount,
		deletingAccountId,
	};
}
