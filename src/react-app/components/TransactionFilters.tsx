import type { Account, Category, DashboardFilters } from "../types";

type TransactionFiltersProps = {
	accounts: Account[];
	categories: Category[];
	filters: DashboardFilters;
	setFilters: (filters: DashboardFilters) => void;
};

export function TransactionFilters({
	accounts,
	categories,
	filters,
	setFilters,
}: TransactionFiltersProps) {
	const update = (field: keyof DashboardFilters, value: string) =>
		setFilters({ ...filters, [field]: value });
	const clear = () => setFilters({ account: "", type: "", category: "", from: "", to: "" });
	const expenseCategories = categories.filter((item) => item.type === "expense");
	const incomeCategories = categories.filter((item) => item.type === "income");

	return (
		<div className="filter-bar" role="group" aria-label="Transaction filters">
			<label className="filter-field">
				<span>Account</span>
				<select
					value={filters.account}
					onChange={(event) => update("account", event.target.value)}
					aria-label="Filter by account"
				>
					<option value="">All accounts</option>
					{accounts.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</label>
			<label className="filter-field">
				<span>Type</span>
				<select
					value={filters.type}
					onChange={(event) => update("type", event.target.value)}
					aria-label="Filter by type"
				>
					<option value="">All types</option>
					<option value="income">Income</option>
					<option value="expense">Expense</option>
					<option value="transfer">Transfer</option>
				</select>
			</label>
			<label className="filter-field">
				<span>Category</span>
				<select
					value={filters.category}
					onChange={(event) => update("category", event.target.value)}
					aria-label="Filter by category"
				>
					<option value="">All categories</option>
					{expenseCategories.length > 0 && (
						<optgroup label="Expenses">
							{expenseCategories.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</optgroup>
					)}
					{incomeCategories.length > 0 && (
						<optgroup label="Income">
							{incomeCategories.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</optgroup>
					)}
				</select>
			</label>
			<label className="filter-field">
				<span>From date</span>
				<input
					type="date"
					value={filters.from}
					onChange={(event) => update("from", event.target.value)}
					aria-label="Transactions from date"
				/>
			</label>
			<label className="filter-field">
				<span>To date</span>
				<input
					type="date"
					value={filters.to}
					onChange={(event) => update("to", event.target.value)}
					aria-label="Transactions to date"
				/>
			</label>
			<button className="cancel-button" type="button" onClick={clear}>
				Clear
			</button>
		</div>
	);
}
