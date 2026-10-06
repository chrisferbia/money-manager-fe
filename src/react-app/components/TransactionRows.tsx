import type { MoneyFormatter, Transaction } from "../types";

type TransactionRowContext = {
	readOnly?: boolean;
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	money: MoneyFormatter;
	onEdit: (transaction: Transaction, trigger?: HTMLElement) => void;
};

type TransactionRowsProps = TransactionRowContext & {
	transactions: Transaction[];
	subtotalTransactions?: Transaction[];
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
	readOnly = false,
	transactions,
	subtotalTransactions,
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
	const subtotals = new Map<string, { income: number; expense: number }>();
	for (const transaction of subtotalTransactions ?? []) {
		const key = formatTransactionDate(
			groupByCreatedAt ? transaction.created_at : transaction.occurred_at,
		);
		const totals = subtotals.get(key) ?? { income: 0, expense: 0 };
		if (transaction.type === "income" || transaction.type === "expense")
			totals[transaction.type] += transaction.amount;
		subtotals.set(key, totals);
	}
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
						{subtotals.has(dateLabel) && (
							<span className="daily-subtotals">
								<span className="income">
									{money(subtotals.get(dateLabel)!.income)}
								</span>
								<span className="expense">
									{money(subtotals.get(dateLabel)!.expense)}
								</span>
							</span>
						)}
					</h4>
					<div className="transaction-date-list">
						{group.map((transaction) => (
							<TransactionRow
								readOnly={readOnly}
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
	readOnly = false,
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
			? "Transfer"
			: transaction.category_id
				? (categoryNames.get(transaction.category_id) ?? "Category")
				: typeLabel;
	const description = transaction.description?.trim() || "-";
	const counterparty = transaction.counterparty?.trim() || "-";
	const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";

	return (
		<button
			type="button"
			className={`transaction-row ${transaction.type}`}
			disabled={readOnly}
			onClick={(event) => onEdit(transaction, event.currentTarget)}
		>
			<span className="transaction-field transaction-category" title={categoryLabel}>
				<span className="transaction-field-label">
					{transaction.type === "transfer" ? "Type:" : "Cat:"}
				</span>
				<span className="transaction-value">{categoryLabel}</span>
			</span>
			<strong className={`transaction-value transaction-amount ${transaction.type}`}>
				{sign}
				{money(transaction.amount)}
			</strong>
			<span className="transaction-compact-meta">
				<span
					className="transaction-field transaction-description"
					title={`Description: ${description}`}
				>
					<span className="transaction-field-label">Desc:</span>
					<span className="transaction-value">{description}</span>
				</span>
				<span className="transaction-field transaction-account" title={accountLabel}>
					<span className="transaction-field-label">
						{transaction.type === "transfer" ? "From:" : "Acc:"}
					</span>
					<span className="transaction-value">{sourceAccountLabel}</span>
				</span>
				<span
					className="transaction-field transaction-counterparty"
					title={transaction.type === "transfer" ? destinationAccountLabel : counterparty}
				>
					<span className="transaction-field-label">
						{transaction.type === "income"
							? "From:"
							: transaction.type === "expense"
								? "PayTo:"
								: "To:"}
					</span>
					<span className="transaction-value">
						{transaction.type === "transfer" ? destinationAccountLabel : counterparty}
					</span>
				</span>
			</span>
		</button>
	);
}
