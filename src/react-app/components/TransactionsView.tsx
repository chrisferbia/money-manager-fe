import { useEffect, useRef, useState, type FormEvent } from "react";
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
	openAddRequest: number;
	onAddRequestHandled: () => void;
	expenseCategories: Category[];
	incomeCategories: Category[];
	money: MoneyFormatter;
	onSave: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
	onEdit: (transaction: Transaction, trigger?: HTMLElement) => void;
	onDelete: (transaction: Transaction) => Promise<boolean>;
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
	openAddRequest,
	onAddRequestHandled,
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
	const activeFilterCount = Object.values(filters).filter(Boolean).length;
	const [formOpen, setFormOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const handledAddRequestRef = useRef(0);
	const onCancelRef = useRef(onCancel);
	onCancelRef.current = onCancel;
	const openEditForm = (transaction: Transaction, trigger?: HTMLElement) => {
		returnFocusRef.current = trigger ?? null;
		onEdit(transaction, trigger);
		setFormOpen(true);
	};
	const closeForm = () => {
		onCancel();
		setFormOpen(false);
		window.requestAnimationFrame(() => returnFocusRef.current?.focus());
	};
	const handleSave = async (event: FormEvent<HTMLFormElement>) => {
		if (await onSave(event)) closeForm();
	};
	const handleDelete = async () => {
		if (!editing) return;
		setDeleting(true);
		try {
			if (await onDelete(editing)) closeForm();
		} finally {
			setDeleting(false);
		}
	};

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (formOpen && !dialog.open) dialog.showModal();
		if (!formOpen && dialog.open) dialog.close();
		if (formOpen) {
			window.requestAnimationFrame(() =>
				dialog
					.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled])")
					?.focus(),
			);
		}
	}, [formOpen, editing]);

	useEffect(() => {
		if (openAddRequest === 0 || openAddRequest <= handledAddRequestRef.current) return;
		handledAddRequestRef.current = openAddRequest;
		onAddRequestHandled();
		returnFocusRef.current = document.querySelector<HTMLElement>(".floating-add-button");
		onCancelRef.current();
		setFormOpen(true);
	}, [onAddRequestHandled, openAddRequest]);

	return (
		<>
			<dialog
				ref={dialogRef}
				className="transaction-dialog"
				aria-labelledby="transaction-dialog-title"
				onCancel={(event) => {
					event.preventDefault();
					closeForm();
				}}
				onClick={(event) => {
					if (event.target === event.currentTarget) closeForm();
				}}
			>
				<section className="transaction-dialog-content" id="transaction-form">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">{editing ? "EDIT ENTRY" : "NEW ENTRY"}</p>
							<h3 id="transaction-dialog-title">
								{editing ? "Edit transaction" : "Add transaction"}
							</h3>
						</div>
						<button className="dialog-close" type="button" onClick={closeForm}>
							Close
						</button>
					</div>
					<TransactionForm
						accounts={accounts}
						entry={entry}
						setEntry={setEntry}
						editing={editing}
						saving={saving}
						expenseCategories={expenseCategories}
						incomeCategories={incomeCategories}
						onSave={handleSave}
						onCancel={closeForm}
						onDelete={handleDelete}
						deleting={deleting}
					/>
				</section>
			</dialog>
			<section className="panel transactions-panel transaction-history-panel">
				<div className="panel-heading transaction-history-heading">
					<div>
						<p className="eyebrow">HISTORY</p>
						<h3>Transaction history</h3>
						<p className="transaction-result-count">{transactionResultLabel}</p>
					</div>
					<button
						className="filter-toggle"
						type="button"
						aria-expanded={filtersOpen}
						aria-controls="transaction-filters"
						onClick={() => setFiltersOpen((open) => !open)}
					>
						{filtersOpen ? "Hide filters" : "Show filters"}
						{activeFilterCount > 0 && (
							<span className="filter-count">{activeFilterCount}</span>
						)}
					</button>
				</div>
				{filtersOpen && (
					<div id="transaction-filters">
						<TransactionFilters
							accounts={accounts}
							categories={categories}
							filters={filters}
							setFilters={setFilters}
						/>
					</div>
				)}
				<TransactionRows
					transactions={visibleTransactions}
					accountNames={accountNames}
					categoryNames={categoryNames}
					money={money}
					onEdit={openEditForm}
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
		</>
	);
}
