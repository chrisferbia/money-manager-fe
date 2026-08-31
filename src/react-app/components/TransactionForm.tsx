import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Account, Category, EntryForm, EntryType, Transaction } from "../types";

type TransactionFormProps = {
	accounts: Account[];
	entry: EntryForm;
	setEntry: Dispatch<SetStateAction<EntryForm>>;
	editing: Transaction | null;
	saving: boolean;
	expenseCategories: Category[];
	incomeCategories: Category[];
	onSave: (event: FormEvent<HTMLFormElement>) => void;
	onCancel: () => void;
};

function entryTypeLabel(type: EntryType) {
	return type === "expense" ? "Expense" : type === "income" ? "Income" : "Transfer";
}

export function TransactionForm({
	accounts,
	entry,
	setEntry,
	editing,
	saving,
	expenseCategories,
	incomeCategories,
	onSave,
	onCancel,
}: TransactionFormProps) {
	const update = (changes: Partial<EntryForm>) =>
		setEntry((current) => ({ ...current, ...changes }));

	return (
		<form onSubmit={onSave}>
			<div className="type-switch" role="group" aria-label="Transaction type">
				{(["expense", "income", "transfer"] as EntryType[]).map((kind) => (
					<button
						key={kind}
						type="button"
						className={
							entry.type === kind
								? `active ${kind === "income" ? "income-tab" : kind === "transfer" ? "transfer-tab" : ""}`
								: ""
						}
						disabled={Boolean(editing)}
						aria-pressed={entry.type === kind}
						onClick={() => update({ type: kind, categoryId: "", destinationId: "" })}
					>
						{entryTypeLabel(kind)}
					</button>
				))}
			</div>
			<label>
				Account
				<select
					value={entry.accountId}
					disabled={Boolean(editing)}
					required
					onChange={(event) => update({ accountId: event.target.value })}
				>
					<option value="">Select account</option>
					{accounts.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</label>
			{entry.type === "transfer" && !editing && (
				<label>
					Destination account
					<select
						value={entry.destinationId}
						required
						onChange={(event) => update({ destinationId: event.target.value })}
					>
						<option value="">Select destination</option>
						{accounts
							.filter((item) => String(item.id) !== entry.accountId)
							.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
					</select>
				</label>
			)}
			{entry.type !== "transfer" && (
				<label>
					Category{" "}
					{entry.type === "income" && <span className="optional">(optional)</span>}
					<select
						value={entry.categoryId}
						required={entry.type === "expense"}
						onChange={(event) => update({ categoryId: event.target.value })}
					>
						<option value="">
							{entry.type === "income" ? "No category" : "Select category"}
						</option>
						{(entry.type === "income" ? incomeCategories : expenseCategories).map(
							(item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							),
						)}
					</select>
				</label>
			)}
			{editing?.type === "transfer" && (
				<p className="form-note">
					Source and destination accounts cannot be changed for a transfer.
				</p>
			)}
			<div className="form-row">
				<label>
					Amount (IDR)
					<input
						type="number"
						min="1"
						step="1"
						required
						inputMode="numeric"
						value={entry.amount}
						onChange={(event) => update({ amount: event.target.value })}
						placeholder="1000"
					/>
				</label>
				<label>
					Date
					<input
						type="date"
						value={entry.date}
						required
						onChange={(event) => update({ date: event.target.value })}
					/>
				</label>
			</div>
			<label>
				Counterparty <span className="optional">(optional)</span>
				<input
					value={entry.counterparty}
					onChange={(event) => update({ counterparty: event.target.value })}
					placeholder="Merchant, employer, or person"
				/>
			</label>
			<label>
				Description <span className="optional">(optional)</span>
				<input
					value={entry.description}
					onChange={(event) => update({ description: event.target.value })}
					placeholder="What was this for?"
				/>
			</label>
			<button className="submit-button" type="submit" disabled={saving}>
				{saving ? "Saving..." : editing ? "Save changes" : `Add ${entry.type}`}{" "}
				<span>+</span>
			</button>
			{editing && (
				<button className="cancel-button" type="button" onClick={onCancel}>
					Cancel editing
				</button>
			)}
		</form>
	);
}
