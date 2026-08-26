import type { MoneyFormatter, Transaction } from "../types";

type TransactionRowContext = {
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	money: MoneyFormatter;
	onEdit: (transaction: Transaction) => void;
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
	const label =
		transaction.type === "transfer"
			? `${accountNames.get(transaction.account_id)} to ${accountNames.get(transaction.related_account_id ?? 0)}`
			: transaction.category_id
				? (categoryNames.get(transaction.category_id) ?? "Category")
				: transaction.type;
	const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";

	return (
		<div className="transaction-row">
			<div className={`transaction-icon ${transaction.type}`}>
				{transaction.type === "income"
					? "IN"
					: transaction.type === "expense"
						? "OUT"
						: "TRF"}
			</div>
			<div className="transaction-details">
				<strong>{label}</strong>
				<span>
					{transaction.description ||
						accountNames.get(transaction.account_id) ||
						"Transaction"}{" "}
					·{" "}
					{new Date(transaction.occurred_at).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})}
				</span>
			</div>
			<strong className={transaction.type}>
				{sign}
				{money(transaction.amount)}
			</strong>
			<button
				type="button"
				className="edit-button"
				onClick={() => onEdit(transaction)}
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
