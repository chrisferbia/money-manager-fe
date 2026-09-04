import type { MoneyFormatter, Transaction } from "../types";

type TransactionRowContext = {
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	money: MoneyFormatter;
	onEdit: (transaction: Transaction, trigger?: HTMLButtonElement) => void;
	onDelete: (transaction: Transaction) => void;
};

type TransactionRowsProps = TransactionRowContext & {
	transactions: Transaction[];
	emptyTitle?: string;
	emptyDescription?: string;
};

export function TransactionRows({
	transactions,
	accountNames,
	categoryNames,
	money,
	onEdit,
	onDelete,
	emptyTitle = "No transactions yet",
	emptyDescription = "Add an income, expense, or transfer to see activity here.",
}: TransactionRowsProps) {
	if (!transactions.length)
		return (
			<div className="empty-state">
				<strong>{emptyTitle}</strong>
				<span>{emptyDescription}</span>
			</div>
		);

	return (
		<div className="transaction-list">
			{transactions.map((transaction) => (
				<TransactionRow
					key={transaction.id}
					transaction={transaction}
					accountNames={accountNames}
					categoryNames={categoryNames}
					money={money}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}

function TransactionRow({
	transaction,
	accountNames,
	categoryNames,
	money,
	onEdit,
	onDelete,
}: TransactionRowContext & { transaction: Transaction }) {
	const typeLabel =
		transaction.type === "income"
			? "Income"
			: transaction.type === "expense"
				? "Expense"
				: "Transfer";
	const categoryLabel =
		transaction.type === "transfer"
			? `${accountNames.get(transaction.account_id)} to ${accountNames.get(transaction.related_account_id ?? 0)}`
			: transaction.category_id
				? (categoryNames.get(transaction.category_id) ?? "Category")
				: typeLabel;
	const counterparty = transaction.counterparty?.trim();
	const label = counterparty || categoryLabel;
	const description = transaction.description?.trim();
	const subcategory = transaction.transaction_subtype?.trim();
	const context = [
		counterparty ? categoryLabel : null,
		accountNames.get(transaction.account_id) || "Account",
		description,
	]
		.filter(Boolean)
		.join(" · ");
	const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";

	return (
		<div className="transaction-row">
			<div
				className={`transaction-icon ${transaction.type}`}
				aria-label={
					transaction.type === "income"
						? "Income"
						: transaction.type === "expense"
							? "Expense"
							: "Transfer"
				}
			>
				{transaction.type === "income" ? (
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M7 17 17 7" />
						<path d="M8 7h9v9" />
					</svg>
				) : transaction.type === "expense" ? (
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M7 7l10 10" />
						<path d="M17 8v9H8" />
					</svg>
				) : (
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M8 3 4 7l4 4" />
						<path d="M4 7h16" />
						<path d="m16 21 4-4-4-4" />
						<path d="M20 17H4" />
					</svg>
				)}
			</div>
			<div className="transaction-details">
				<strong>{label}</strong>
				<span>
					{context} ·{" "}
					{new Date(transaction.occurred_at).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})}
				</span>
				{subcategory && (
					<span className="transaction-subcategory">Subcategory: {subcategory}</span>
				)}
			</div>
			<strong className={transaction.type}>
				{sign}
				{money(transaction.amount)}
			</strong>
			<button
				type="button"
				className="edit-button"
				onClick={(event) => onEdit(transaction, event.currentTarget)}
				aria-label={`Edit ${label}`}
			>
				Edit
			</button>
			<button
				type="button"
				className="delete-button"
				onClick={() => onDelete(transaction)}
				aria-label={`Delete ${label}`}
			>
				Delete
			</button>
		</div>
	);
}
