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

	return (
		<div className="filter-bar">
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
			<select
				value={filters.category}
				onChange={(event) => update("category", event.target.value)}
				aria-label="Filter by category"
			>
				<option value="">All categories</option>
				{categories.map((item) => (
					<option key={item.id} value={item.id}>
						{item.name}
					</option>
				))}
			</select>
			<input
				type="date"
				value={filters.from}
				onChange={(event) => update("from", event.target.value)}
				aria-label="Transactions from date"
			/>
			<input
				type="date"
				value={filters.to}
				onChange={(event) => update("to", event.target.value)}
				aria-label="Transactions to date"
			/>
			<button className="cancel-button" onClick={clear}>
				Clear
			</button>
		</div>
	);
}
