import type { MoneyFormatter, Transaction } from "../types";

type TransactionRowContext = {
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	money: MoneyFormatter;
	onEdit: (transaction: Transaction, trigger?: HTMLElement) => void;
};

type TransactionRowsProps = TransactionRowContext & {
	transactions: Transaction[];
	groupByCreatedAt?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
};

function formatTransactionDate(value: string) {
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function TransactionRows({
	transactions,
	accountNames,
	categoryNames,
	money,
	onEdit,
	groupByCreatedAt = false,
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

	const groups = new Map<string, Transaction[]>();
	for (const transaction of transactions) {
		const dateLabel = formatTransactionDate(
			groupByCreatedAt ? transaction.created_at : transaction.occurred_at,
		);
		const group = groups.get(dateLabel) ?? [];
		group.push(transaction);
		groups.set(dateLabel, group);
	}

	return (
		<div className="transaction-list">
			{Array.from(groups, ([dateLabel, group]) => (
				<section className="transaction-date-group" key={dateLabel}>
					<h4 className="transaction-date-heading">
						{groupByCreatedAt ? `Added ${dateLabel}` : dateLabel}
					</h4>
					<div className="transaction-date-list">
						{group.map((transaction) => (
							<TransactionRow
								key={transaction.id}
								transaction={transaction}
								accountNames={accountNames}
								categoryNames={categoryNames}
								money={money}
								onEdit={onEdit}
							/>
						))}
					</div>
				</section>
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
}: TransactionRowContext & { transaction: Transaction }) {
	const typeLabel =
		transaction.type === "income"
			? "Income"
			: transaction.type === "expense"
				? "Expense"
				: "Transfer";
	const sourceAccountLabel = accountNames.get(transaction.account_id) ?? "Account";
	const destinationAccountLabel =
		accountNames.get(transaction.related_account_id ?? 0) ?? "Account";
	const accountLabel =
		transaction.type === "transfer"
			? `${sourceAccountLabel} -> ${destinationAccountLabel}`
			: sourceAccountLabel;
	const categoryLabel =
		transaction.type === "transfer"
			? "-"
			: transaction.category_id
				? (categoryNames.get(transaction.category_id) ?? "Category")
				: typeLabel;
	const description = transaction.description?.trim() || "-";
	const counterparty = transaction.counterparty?.trim() || "-";
	const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";

	return (
		<div
			className={`transaction-row ${transaction.type}`}
			role="button"
			tabIndex={0}
			onClick={(event) => onEdit(transaction, event.currentTarget)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onEdit(transaction, event.currentTarget);
				}
			}}
			aria-label={`Open ${typeLabel.toLowerCase()} transaction for ${categoryLabel}`}
		>
			<span className="transaction-value transaction-category" title={categoryLabel}>
				{categoryLabel}
			</span>
			<span className="transaction-value transaction-description" title={description}>
				{description}
			</span>
			<strong className={`transaction-value transaction-amount ${transaction.type}`}>
				{sign}
				{money(transaction.amount)}
			</strong>
			<span className="transaction-value transaction-account" title={accountLabel}>
				{accountLabel}
			</span>
			<span className="transaction-value transaction-counterparty" title={counterparty}>
				{counterparty}
			</span>
		</div>
	);
}
