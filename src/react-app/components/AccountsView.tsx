import {
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type FormEvent,
	type SetStateAction,
} from "react";
import type { Account, MoneyFormatter } from "../types";
import {
	accountNameMaxLength,
	accountTypeLabel,
	accountTypeMark,
	accountTypes,
} from "../utils/constants";

type AccountsViewProps = {
	accounts: Account[];
	loading: boolean;
	money: MoneyFormatter;
	draft: { name: string; type: string };
	setDraft: Dispatch<SetStateAction<{ name: string; type: string }>>;
	editing: Account | null;
	setEditing: Dispatch<SetStateAction<Account | null>>;
	saving: boolean;
	deletingId: number | null;
	onSave: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
	onDelete: (account: Account) => void;
};

function balanceTone(amount: number) {
	return amount < 0 ? "negative" : amount > 0 ? "positive" : "zero";
}

export function AccountsView({
	accounts,
	loading,
	money,
	draft,
	setDraft,
	editing,
	setEditing,
	saving,
	deletingId,
	onSave,
	onDelete,
}: AccountsViewProps) {
	const [formOpen, setFormOpen] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const addButtonRef = useRef<HTMLButtonElement>(null);
	const returnFocusRef = useRef<HTMLButtonElement | null>(null);
	const totalBalance = accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
	const accountCountLabel = `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`;
	const sortedAccounts = [...accounts].sort((left, right) =>
		left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
	);
	const resetForm = () => {
		setEditing(null);
		setDraft({ name: "", type: "cash" });
		setFormOpen(false);
	};
	const closeForm = () => {
		resetForm();
		window.requestAnimationFrame(() => returnFocusRef.current?.focus());
	};
	const openAddForm = () => {
		returnFocusRef.current = addButtonRef.current;
		setEditing(null);
		setDraft({ name: "", type: "cash" });
		setFormOpen(true);
	};
	const handleSave = async (event: FormEvent<HTMLFormElement>) => {
		if (await onSave(event)) closeForm();
	};
	const startEdit = (account: Account, trigger: HTMLButtonElement) => {
		returnFocusRef.current = trigger;
		setEditing(account);
		setDraft({ name: account.name, type: account.type });
		setFormOpen(true);
	};

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (formOpen && !dialog.open) dialog.showModal();
		if (!formOpen && dialog.open) dialog.close();
		if (formOpen) nameInputRef.current?.focus();
	}, [formOpen]);

	return (
		<>
			<section className="page-heading account-page-heading">
				<div>
					<p className="eyebrow">REFERENCE DATA</p>
					<h2>Accounts</h2>
					<p className="muted">Manage the places where you keep money.</p>
				</div>
				<div className="account-heading-actions">
					<div className={`account-total-summary ${balanceTone(totalBalance)}`}>
						<span>Total balance</span>
						<strong>{money(totalBalance)}</strong>
					</div>
					<button
						ref={addButtonRef}
						className="primary-button"
						type="button"
						onClick={openAddForm}
						aria-expanded={formOpen}
						aria-controls="account-form"
					>
						+ Add account
					</button>
				</div>
			</section>
			<dialog
				ref={dialogRef}
				className="account-dialog"
				aria-labelledby="account-dialog-title"
				onCancel={(event) => {
					event.preventDefault();
					closeForm();
				}}
				onClick={(event) => {
					if (event.target === event.currentTarget) closeForm();
				}}
			>
				<section className="account-dialog-content" id="account-form">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">{editing ? "EDIT ACCOUNT" : "NEW ACCOUNT"}</p>
							<h3 id="account-dialog-title">
								{editing ? "Update account" : "Add account"}
							</h3>
						</div>
						<button className="dialog-close" type="button" onClick={closeForm}>
							Close
						</button>
					</div>
					<form onSubmit={handleSave}>
						<label>
							Name
							<input
								ref={nameInputRef}
								value={draft.name}
								onChange={(event) =>
									setDraft({ ...draft, name: event.target.value })
								}
								placeholder="Everyday checking"
								required
								maxLength={accountNameMaxLength}
								autoComplete="off"
							/>
						</label>
						<label>
							Type
							<select
								value={draft.type}
								onChange={(event) =>
									setDraft({ ...draft, type: event.target.value })
								}
							>
								{accountTypes.map((type) => (
									<option key={type} value={type}>
										{accountTypeLabel(type)}
									</option>
								))}
							</select>
						</label>
						<button className="submit-button" disabled={saving || deletingId !== null}>
							{saving ? "Saving..." : editing ? "Save account" : "Add account"}
						</button>
						{editing && (
							<button
								className="cancel-button"
								type="button"
								disabled={saving}
								onClick={closeForm}
							>
								Cancel
							</button>
						)}
					</form>
				</section>
			</dialog>
			<div className="two-column accounts-layout">
				<section className="panel account-list-panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">ACCOUNT LIST</p>
							<h3>{accountCountLabel}</h3>
						</div>
					</div>
					{loading && accounts.length === 0 ? (
						<div className="empty-state" aria-live="polite">
							<strong>Loading accounts...</strong>
						</div>
					) : accounts.length === 0 ? (
						<div className="empty-state">
							<strong>No accounts yet</strong>
							<span>Add an account to start tracking your balances.</span>
						</div>
					) : (
						<div className="managed-account-grid" aria-busy={deletingId !== null}>
							{sortedAccounts.map((account) => {
								const accountBalance = account.balance ?? 0;
								const isEditing = editing?.id === account.id;

								return (
									<article
										className={`managed-account-card${isEditing ? " is-editing" : ""}`}
										key={account.id}
									>
										<div className="account-card-header">
											<div className="account-type-label">
												<span
													className={`account-type-mark ${account.type}`}
													aria-hidden="true"
												>
													{accountTypeMark(account.type)}
												</span>
												<span>{accountTypeLabel(account.type)}</span>
											</div>
											<div className="account-card-actions">
												<button
													type="button"
													className="edit-button"
													disabled={saving || deletingId !== null}
													aria-label={`Edit ${account.name}`}
													onClick={(event) =>
														startEdit(account, event.currentTarget)
													}
												>
													Edit
												</button>
												<button
													type="button"
													className="delete-button"
													disabled={
														saving || deletingId !== null || isEditing
													}
													aria-label={`Delete ${account.name}`}
													title={
														isEditing
															? "Cancel editing before deleting"
															: undefined
													}
													onClick={() => onDelete(account)}
												>
													{deletingId === account.id
														? "Deleting..."
														: "Delete"}
												</button>
											</div>
										</div>
										<strong className="account-card-name" title={account.name}>
											{account.name}
										</strong>
										<b
											className={`account-balance ${balanceTone(accountBalance)}`}
										>
											{money(accountBalance)}
										</b>
									</article>
								);
							})}
						</div>
					)}
				</section>
			</div>
		</>
	);
}
