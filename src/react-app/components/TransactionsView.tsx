import { useState, type FormEvent } from "react";
import type {
	Account,
	Category,
	DashboardFilters,
	EntryForm,
	MoneyFormatter,
	Transaction,
} from "../types";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionForm } from "./TransactionForm";
import { TransactionRows } from "./TransactionRows";
import type { Dispatch, SetStateAction } from "react";

type TransactionsViewProps = {
	accounts: Account[];
	categories: Category[];
	filters: DashboardFilters;
	setFilters: (filters: DashboardFilters) => void;
	transactions: Transaction[];
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	entry: EntryForm;
	setEntry: Dispatch<SetStateAction<EntryForm>>;
	editing: Transaction | null;
	saving: boolean;
	expenseCategories: Category[];
	incomeCategories: Category[];
	money: MoneyFormatter;
	onSave: (event: FormEvent<HTMLFormElement>) => void;
	onEdit: (transaction: Transaction) => void;
	onDelete: (transaction: Transaction) => void;
	onCancel: () => void;
};

const transactionsPageSize = 25;

export function TransactionsView({
	accounts,
	categories,
	filters,
	setFilters,
	transactions,
	accountNames,
	categoryNames,
	entry,
	setEntry,
	editing,
	saving,
	expenseCategories,
	incomeCategories,
	money,
	onSave,
	onEdit,
	onDelete,
	onCancel,
}: TransactionsViewProps) {
	const hasFilters = Object.values(filters).some(Boolean);
	const filterKey = JSON.stringify(filters);
	const [pagination, setPagination] = useState({
		filterKey: "",
		visibleCount: transactionsPageSize,
	});
	const visibleTransactionCount =
		pagination.filterKey === filterKey ? pagination.visibleCount : transactionsPageSize;
	const visibleTransactions = transactions.slice(0, visibleTransactionCount);
	const transactionCountLabel = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
	const transactionResultLabel =
		visibleTransactions.length < transactions.length
			? `Showing ${visibleTransactions.length} of ${transactionCountLabel}`
			: transactionCountLabel;

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
			<TransactionFilters
				accounts={accounts}
				categories={categories}
				filters={filters}
				setFilters={setFilters}
			/>
			<div className="filter-summary">
				{hasFilters
					? "Showing results for the selected filters."
					: "Showing all transactions."}
			</div>
			<div className="two-column transaction-layout">
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
						incomeCategories={incomeCategories}
						onSave={onSave}
						onCancel={onCancel}
					/>
				</section>
				<section className="panel transactions-panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">HISTORY</p>
							<h3>Transaction history</h3>
							<p className="transaction-result-count">{transactionResultLabel}</p>
						</div>
					</div>
					<TransactionRows
						transactions={visibleTransactions}
						accountNames={accountNames}
						categoryNames={categoryNames}
						money={money}
						onEdit={onEdit}
						onDelete={onDelete}
						emptyTitle={hasFilters ? "No matching transactions" : "No transactions yet"}
						emptyDescription={
							hasFilters
								? "Try clearing a filter or choosing a wider date range."
								: "Add an income, expense, or transfer to see activity here."
						}
					/>
					{visibleTransactions.length < transactions.length && (
						<button
							className="expand-button"
							type="button"
							onClick={() =>
								setPagination((current) => ({
									filterKey,
									visibleCount:
										(current.filterKey === filterKey
											? current.visibleCount
											: transactionsPageSize) + transactionsPageSize,
								}))
							}
						>
							Show more transactions
						</button>
					)}
				</section>
			</div>
		</>
	);
}
