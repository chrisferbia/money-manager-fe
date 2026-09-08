import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
	Account,
	Category,
	DashboardFilters,
	EntryForm,
	MoneyFormatter,
	Transaction,
	TransactionSort,
} from "../types";
import { sortTransactions } from "../utils/transactions";
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
	sort: TransactionSort;
	onSortChange: (sort: TransactionSort) => void;
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
type ActiveFilterKey = keyof DashboardFilters;

function formatFilterDate(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return value;
	return new Date(year, month - 1, day).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function titleCase(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

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
	sort,
	onSortChange,
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
	const [searchQuery, setSearchQuery] = useState("");
	const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
	const sortedTransactions = useMemo(
		() => sortTransactions(transactions, sort),
		[sort, transactions],
	);
	const searchedTransactions = useMemo(() => {
		if (!normalizedSearchQuery) return sortedTransactions;
		return sortedTransactions.filter((transaction) => {
			const typeLabel = titleCase(transaction.type);
			const sourceAccountLabel = accountNames.get(transaction.account_id) ?? "Account";
			const destinationAccountLabel =
				accountNames.get(transaction.related_account_id ?? 0) ?? "Account";
			const accountLabel =
				transaction.type === "transfer"
					? `${sourceAccountLabel} ${destinationAccountLabel}`
					: sourceAccountLabel;
			const categoryLabel =
				transaction.type === "transfer"
					? "Transfer"
					: transaction.category_id
						? (categoryNames.get(transaction.category_id) ?? "Category")
						: typeLabel;
			return [
				typeLabel,
				accountLabel,
				categoryLabel,
				transaction.description,
				transaction.counterparty,
			].some((value) => value?.toLocaleLowerCase().includes(normalizedSearchQuery));
		});
	}, [accountNames, categoryNames, normalizedSearchQuery, sortedTransactions]);
	const filterKey = JSON.stringify({ filters, normalizedSearchQuery, sort });
	const [pagination, setPagination] = useState({
		filterKey: "",
		visibleCount: transactionsPageSize,
	});
	const visibleTransactionCount =
		pagination.filterKey === filterKey ? pagination.visibleCount : transactionsPageSize;
	const visibleTransactions = searchedTransactions.slice(0, visibleTransactionCount);
	const transactionCountLabel = `${searchedTransactions.length} transaction${
		searchedTransactions.length === 1 ? "" : "s"
	}`;
	const transactionResultLabel =
		visibleTransactions.length < searchedTransactions.length
			? `Showing ${visibleTransactions.length} of ${transactionCountLabel}`
			: transactionCountLabel;
	const activeFilterCount = Object.values(filters).filter(Boolean).length;
	const hasVisibleCriteria = hasFilters || Boolean(normalizedSearchQuery);
	const activeFilterChips: Array<{
		key: ActiveFilterKey | "search";
		label: string;
		value: string;
	}> = [];
	if (filters.account)
		activeFilterChips.push({
			key: "account",
			label: "Account",
			value: accountNames.get(Number(filters.account)) ?? "Selected account",
		});
	if (filters.type)
		activeFilterChips.push({ key: "type", label: "Type", value: titleCase(filters.type) });
	if (filters.category)
		activeFilterChips.push({
			key: "category",
			label: "Category",
			value: categoryNames.get(Number(filters.category)) ?? "Selected category",
		});
	if (filters.from)
		activeFilterChips.push({ key: "from", label: "From", value: formatFilterDate(filters.from) });
	if (filters.to)
		activeFilterChips.push({ key: "to", label: "To", value: formatFilterDate(filters.to) });
	if (normalizedSearchQuery)
		activeFilterChips.push({ key: "search", label: "Search", value: searchQuery.trim() });
	const removeFilter = (key: ActiveFilterKey | "search") => {
		if (key === "search") {
			setSearchQuery("");
			return;
		}
		setFilters({ ...filters, [key]: "" });
	};
	const clearAllFilters = () => setFilters({ account: "", type: "", category: "", from: "", to: "" });
	const incomeTotal = searchedTransactions
		.filter((transaction) => transaction.type === "income")
		.reduce((total, transaction) => total + transaction.amount, 0);
	const expenseTotal = searchedTransactions
		.filter((transaction) => transaction.type === "expense")
		.reduce((total, transaction) => total + transaction.amount, 0);
	const netTotal = incomeTotal - expenseTotal;
	const [formOpen, setFormOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const handledAddRequestRef = useRef(0);
	const pendingAddRequestRef = useRef<number | null>(null);
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
		if (formOpen && pendingAddRequestRef.current !== null) {
			pendingAddRequestRef.current = null;
			onAddRequestHandled();
		}
		if (!formOpen && dialog.open) dialog.close();
		if (formOpen) {
			window.requestAnimationFrame(() =>
				dialog
					.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled])")
					?.focus(),
			);
		}
	}, [formOpen, editing, onAddRequestHandled]);

	useEffect(() => {
		if (openAddRequest === 0 || openAddRequest <= handledAddRequestRef.current) return;
		handledAddRequestRef.current = openAddRequest;
		pendingAddRequestRef.current = openAddRequest;
		returnFocusRef.current = document.querySelector<HTMLElement>(".floating-add-button");
		onCancelRef.current();
		setFormOpen(true);
	}, [openAddRequest]);

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
						<div className="transaction-history-actions">
							<label className="transaction-search">
								<span>Search</span>
								<input
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
									placeholder="Description or counterparty"
									aria-label="Search transactions"
								/>
							</label>
							<label className="transaction-sort">
								<span>Sort by</span>
								<select
									value={sort}
									onChange={(event) => onSortChange(event.target.value as TransactionSort)}
									aria-label="Sort transactions"
								>
									<option value="occurred-desc">Transaction date: newest</option>
									<option value="occurred-asc">Transaction date: oldest</option>
									<option value="created-desc">Date added: newest</option>
									<option value="created-asc">Date added: oldest</option>
								</select>
							</label>
							<button
								className="filter-toggle"
								type="button"
								aria-expanded={filtersOpen}
								aria-controls="transaction-filters"
								onClick={() => setFiltersOpen((open) => !open)}
							>
								{filtersOpen ? "Hide filters" : "Show filters"}
								{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
							</button>
						</div>
					</div>
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
				{activeFilterChips.length > 0 && (
					<div className="active-filters" aria-label="Active transaction filters">
						<div className="active-filter-chips">
							{activeFilterChips.map((chip) => (
								<span className="active-filter-chip" key={chip.key}>
									<span>
										{chip.label}: <strong>{chip.value}</strong>
									</span>
									<button
										type="button"
										aria-label={`Remove ${chip.label.toLowerCase()} filter`}
										onClick={() => removeFilter(chip.key)}
									>
										×
									</button>
								</span>
							))}
						</div>
						{hasFilters && (
							<button className="clear-active-filters" type="button" onClick={clearAllFilters}>
								Clear filters
							</button>
						)}
					</div>
				)}
				{searchedTransactions.length > 0 && (
					<div className="transaction-summary" aria-label="Transaction summary">
						<div>
							<span>Income</span>
							<strong className="income">{money(incomeTotal)}</strong>
						</div>
						<div>
							<span>Expenses</span>
							<strong className="expense">{money(expenseTotal)}</strong>
						</div>
						<div>
							<span>Net</span>
							<strong className={netTotal >= 0 ? "income" : "expense"}>{money(netTotal)}</strong>
						</div>
					</div>
				)}
				<TransactionRows
					transactions={visibleTransactions}
					groupByCreatedAt={sort.startsWith("created")}
					accountNames={accountNames}
					categoryNames={categoryNames}
					money={money}
					onEdit={openEditForm}
					emptyTitle={hasVisibleCriteria ? "No matching transactions" : "No transactions yet"}
					emptyDescription={
						hasVisibleCriteria
							? "Try removing a filter or using a broader search."
							: "Add an income, expense, or transfer to see activity here."
					}
				/>
				{visibleTransactions.length < searchedTransactions.length && (
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
