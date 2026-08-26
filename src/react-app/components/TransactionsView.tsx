import type { FormEvent } from "react";
import type { Account, Category, EntryForm, MoneyFormatter, Transaction } from "../types";
import { TransactionForm } from "./TransactionForm";
import { TransactionRows } from "./TransactionRows";
import type { Dispatch, SetStateAction } from "react";

type TransactionsViewProps = {
	accounts: Account[];
	transactions: Transaction[];
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	entry: EntryForm;
	setEntry: Dispatch<SetStateAction<EntryForm>>;
	editing: Transaction | null;
	saving: boolean;
	expenseCategories: Category[];
	money: MoneyFormatter;
	onSave: (event: FormEvent<HTMLFormElement>) => void;
	onEdit: (transaction: Transaction) => void;
	onDelete: (id: number) => void;
	onCancel: () => void;
};

export function TransactionsView({
	accounts,
	transactions,
	accountNames,
	categoryNames,
	entry,
	setEntry,
	editing,
	saving,
	expenseCategories,
	money,
	onSave,
	onEdit,
	onDelete,
	onCancel,
}: TransactionsViewProps) {
	return (
		<>
			<section className="page-heading">
				<div>
					<p className="eyebrow">LEDGER</p>
					<h2>Transactions</h2>
					<p className="muted">
						Record, edit, filter, and remove activity across your accounts.
					</p>
				</div>
			</section>
			<div className="filter-summary">Use the filters above to narrow the ledger.</div>
			<div className="two-column">
				<section className="panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">{editing ? "EDIT ENTRY" : "NEW ENTRY"}</p>
							<h3>{editing ? "Edit transaction" : "Add transaction"}</h3>
						</div>
					</div>
					<TransactionForm
						accounts={accounts}
						entry={entry}
						setEntry={setEntry}
						editing={editing}
						saving={saving}
						expenseCategories={expenseCategories}
						onSave={onSave}
						onCancel={onCancel}
					/>
				</section>
				<section className="panel transactions-panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">HISTORY</p>
							<h3>All transactions</h3>
						</div>
					</div>
					<TransactionRows
						transactions={transactions}
						accountNames={accountNames}
						categoryNames={categoryNames}
						money={money}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				</section>
			</div>
		</>
	);
}
