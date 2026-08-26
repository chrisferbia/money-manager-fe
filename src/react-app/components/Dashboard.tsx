import type { Account, MoneyFormatter, ReportItem, Transaction, View } from "../types";
import { TransactionRows } from "./TransactionRows";

type DashboardProps = {
	accounts: Account[];
	accountNames: Map<number, string>;
	categoryNames: Map<number, string>;
	transactions: Transaction[];
	report: ReportItem[];
	income: number;
	expenses: number;
	balance: number;
	money: MoneyFormatter;
	onNavigate: (view: View) => void;
};

export function Dashboard({
	accounts,
	accountNames,
	categoryNames,
	transactions,
	report,
	income,
	expenses,
	balance,
	money,
	onNavigate,
}: DashboardProps) {
	const largestCategory = Math.max(...report.map((item) => item.total), 1);
	return (
		<>
			<section className="hero">
				<div>
					<p className="eyebrow">OVERVIEW</p>
					<h2>Your money, made clear.</h2>
					<p className="muted">
						A live view of every account and transaction in your ledger.
					</p>
				</div>
				<div className="balance">
					<span>Total balance</span>
					<strong>{money(balance)}</strong>
				</div>
			</section>
			<section className="stats">
				<div className="stat-card">
					<span className="stat-label">Accounts</span>
					<strong>{accounts.length}</strong>
					<small>Tracked accounts</small>
				</div>
				<div className="stat-card">
					<span className="stat-label">Income</span>
					<strong className="income">{money(income)}</strong>
					<small>In filtered period</small>
				</div>
				<div className="stat-card">
					<span className="stat-label">Expenses</span>
					<strong className="expense">{money(expenses)}</strong>
					<small>In filtered period</small>
				</div>
			</section>
			<div className="dashboard-grid">
				<section className="panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">YOUR ACCOUNTS</p>
							<h3>Balances</h3>
						</div>
						<button className="text-button" onClick={() => onNavigate("accounts")}>
							Manage
						</button>
					</div>
					<div className="account-cards">
						{accounts.map((account) => (
							<div className="account-card" key={account.id}>
								<span>{account.type.replace("_", " ")}</span>
								<strong>{account.name}</strong>
								<b>{money(account.balance ?? 0)}</b>
							</div>
						))}
					</div>
					{accounts.length === 0 && (
						<p className="empty-copy">Create an account to get started.</p>
					)}
				</section>
				<section className="panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">REPORT</p>
							<h3>Expenses by category</h3>
						</div>
						<button className="text-button" onClick={() => onNavigate("reports")}>
							View report
						</button>
					</div>
					{report.length ? (
						<div className="category-list">
							{report.slice(0, 5).map((item) => (
								<div className="category-item" key={item.id}>
									<div className="category-line">
										<span>{item.name}</span>
										<strong>{money(item.total)}</strong>
									</div>
									<div className="progress-track">
										<div
											className="progress-fill"
											style={{
												width: `${(item.total / largestCategory) * 100}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="empty-copy">No expenses in this period.</p>
					)}
				</section>
			</div>
			<section className="panel transactions-panel">
				<div className="panel-heading">
					<div>
						<p className="eyebrow">LATEST</p>
						<h3>Recent activity</h3>
					</div>
					<button className="text-button" onClick={() => onNavigate("transactions")}>
						All transactions
					</button>
				</div>
				<TransactionRows
					transactions={transactions.slice(0, 5)}
					accountNames={accountNames}
					categoryNames={categoryNames}
					money={money}
					onEdit={() => onNavigate("transactions")}
					onDelete={() => undefined}
				/>
			</section>
		</>
	);
}
