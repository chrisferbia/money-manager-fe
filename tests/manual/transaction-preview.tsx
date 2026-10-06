// Isolated component verification: no authentication, network requests, or real ledger.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TransactionRows } from "../../src/react-app/components/TransactionRows";
import type { Transaction } from "../../src/react-app/types";
import "../../src/react-app/index.css";
import "../../src/react-app/App.css";

const fixture: Transaction = {
	id: 1,
	type: "expense",
	account_id: 1,
	category_id: 1,
	related_account_id: null,
	amount: 100000,
	counterparty: "PT VISIONET",
	description: "OVO",
	occurred_at: "2026-10-06T02:00:00Z",
	created_at: "2026-10-06T02:00:00Z",
	transaction_subtype: null,
};
const transactions: Transaction[] = [
	fixture,
	{
		...fixture,
		id: 2,
		category_id: 2,
		amount: 150000,
		description: "Fuel",
		counterparty: "Fuel station",
	},
	{
		...fixture,
		id: 3,
		type: "transfer",
		category_id: null,
		related_account_id: 2,
		amount: 500000,
		description: "ATM withdrawal",
		counterparty: null,
	},
	{
		...fixture,
		id: 4,
		amount: 120000,
		description: "Replacement charging cable and phone adapter",
		counterparty: "Fictional electronics store with a long name",
	},
	{
		...fixture,
		id: 5,
		type: "income",
		category_id: 3,
		amount: 8000000,
		description: "Monthly salary",
		counterparty: "Employer",
		occurred_at: "2026-10-05T02:00:00Z",
	},
	{
		...fixture,
		id: 6,
		amount: 25000,
		description: null,
		counterparty: null,
		occurred_at: "2026-10-05T02:00:00Z",
	},
];
export function Preview() {
	const [readOnly, setReadOnly] = useState(false);
	const [notice, setNotice] = useState("");
	return (
		<main className="app-shell">
			<div className="topbar">
				<div className="brand-mark">$</div>
				<div>
					<p className="eyebrow">PERSONAL FINANCE</p>
					<h1>Money manager</h1>
				</div>
			</div>
			<section className="panel transactions-panel">
				<div className="panel-heading">
					<div>
						<p className="eyebrow">HISTORY</p>
						<h3>Transaction history</h3>
						<p className="muted">6 transactions · fictional local data</p>
					</div>
					<button className="cancel-button" onClick={() => setReadOnly(!readOnly)}>
						{readOnly ? "Use editable preview" : "Use read-only preview"}
					</button>
				</div>
				{notice && <p role="status">{notice}</p>}
				<TransactionRows
					readOnly={readOnly}
					transactions={transactions}
					subtotalTransactions={transactions}
					accountNames={
						new Map([
							[1, "BCA"],
							[2, "Cash"],
						])
					}
					categoryNames={
						new Map([
							[1, "Food"],
							[2, "Transportation"],
							[3, "Salary"],
						])
					}
					money={(amount) => `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`}
					onEdit={(transaction) =>
						setNotice(
							`Edit callback received transaction ${transaction.id}: ${transaction.description ?? "No description"}`,
						)
					}
				/>
			</section>
		</main>
	);
}
createRoot(document.getElementById("root")!).render(<Preview />);
