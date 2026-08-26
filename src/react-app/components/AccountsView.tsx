import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Account, MoneyFormatter } from "../types";
import { accountTypes } from "../utils/constants";

type AccountsViewProps = {
	accounts: Account[];
	money: MoneyFormatter;
	draft: { name: string; type: string };
	setDraft: Dispatch<SetStateAction<{ name: string; type: string }>>;
	editing: Account | null;
	setEditing: Dispatch<SetStateAction<Account | null>>;
	saving: boolean;
	onSave: (event: FormEvent<HTMLFormElement>) => void;
	onDelete: (id: number) => void;
};

export function AccountsView({
	accounts,
	money,
	draft,
	setDraft,
	editing,
	setEditing,
	saving,
	onSave,
	onDelete,
}: AccountsViewProps) {
	return (
		<>
			<section className="page-heading">
				<div>
					<p className="eyebrow">REFERENCE DATA</p>
					<h2>Accounts</h2>
					<p className="muted">Manage the places where you keep money.</p>
				</div>
			</section>
			<div className="two-column">
				<section className="panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">{editing ? "EDIT ACCOUNT" : "NEW ACCOUNT"}</p>
							<h3>{editing ? "Update account" : "Add account"}</h3>
						</div>
					</div>
					<form onSubmit={onSave}>
						<label>
							Name
							<input
								value={draft.name}
								onChange={(event) =>
									setDraft({ ...draft, name: event.target.value })
								}
								placeholder="Everyday checking"
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
									<option key={type}>{type}</option>
								))}
							</select>
						</label>
						<button className="submit-button" disabled={saving}>
							{editing ? "Save account" : "Add account"}
						</button>
						{editing && (
							<button
								className="cancel-button"
								type="button"
								onClick={() => {
									setEditing(null);
									setDraft({ name: "", type: "cash" });
								}}
							>
								Cancel
							</button>
						)}
					</form>
				</section>
				<section className="panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">ACCOUNT LIST</p>
							<h3>{accounts.length} accounts</h3>
						</div>
					</div>
					<div className="managed-list">
						{accounts.map((account) => (
							<div className="managed-row" key={account.id}>
								<div>
									<strong>{account.name}</strong>
									<span>{account.type.replace("_", " ")}</span>
								</div>
								<b>{money(account.balance ?? 0)}</b>
								<button
									className="edit-button"
									onClick={() => {
										setEditing(account);
										setDraft({ name: account.name, type: account.type });
									}}
								>
									Edit
								</button>
								<button
									className="delete-button"
									onClick={() => onDelete(account.id)}
								>
									Delete
								</button>
							</div>
						))}
					</div>
				</section>
			</div>
		</>
	);
}
