import { useEffect, useState } from "react";
import { request } from "../api/client";
import type { Account, MoneyFormatter } from "../types";

export type ReceivableItem = {
	description: string | null;
	lent: number;
	repaid: number;
	outstanding: number;
	transaction_count: number;
};
export type ReceivablesData = { account_id: number; items: ReceivableItem[] };

export function ReceivablesReport({
	accounts,
	money,
}: {
	accounts: Account[];
	money: MoneyFormatter;
}) {
	const [accountId, setAccountId] = useState("");
	const [includeSettled, setIncludeSettled] = useState(false);
	const [result, setResult] = useState<ReceivablesData | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [retry, setRetry] = useState(0);
	const eligible = accounts.filter((account) => account.valuation_mode !== "crypto");
	const selected = eligible.some((account) => String(account.id) === accountId) ? accountId : "";
	useEffect(() => {
		let active = true;
		if (selected) {
			request<ReceivablesData>(`/reports/receivables?account_id=${selected}`)
				.then((data) => {
					if (active) setResult(data);
				})
				.catch((reason: unknown) => {
					if (active)
						setError(
							reason instanceof Error
								? reason.message
								: "Could not load receivables.",
						);
				})
				.finally(() => {
					if (active) setLoading(false);
				});
		}
		return () => {
			active = false;
		};
	}, [selected, retry]);
	// Never display another account's data while a selection change is loading.
	const items = result?.account_id === Number(selected) ? result.items : [];
	const visible = items.filter((item) => includeSettled || item.outstanding !== 0);
	const total = items.reduce((sum, item) => sum + Math.max(0, item.outstanding), 0);
	return (
		<section className="panel receivables-panel" aria-label="Receivables report">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">RECEIVABLES</p>
					<h3>Who owes you money</h3>
				</div>
				<label>
					Account
					<select
						aria-label="Receivables account"
						value={selected}
						onChange={(event) => {
							setAccountId(event.target.value);
							setResult(null);
							setError("");
							setLoading(Boolean(event.target.value));
						}}
					>
						<option value="">Select an account</option>
						{eligible.map((account) => (
							<option key={account.id} value={account.id}>
								{account.name}
							</option>
						))}
					</select>
				</label>
			</div>
			<p className="muted">
				All dates · Transfers in = lent · Transfers out = repaid. Grouped by description;
				names are case-sensitive.
			</p>
			{!selected ? (
				<p>Select your receivables account to see balances by name.</p>
			) : loading ? (
				<p role="status">Loading receivables…</p>
			) : error ? (
				<div role="alert">
					{error}{" "}
					<button
						type="button"
						onClick={() => {
							setError("");
							setLoading(true);
							setRetry((value) => value + 1);
						}}
					>
						Try again
					</button>
				</div>
			) : (
				result?.account_id === Number(selected) && (
					<>
						<p className="receivables-total">
							Total owed <strong>{money(total)}</strong>
						</p>
						<label className="receivables-settled">
							<input
								type="checkbox"
								checked={includeSettled}
								onChange={(event) => setIncludeSettled(event.target.checked)}
							/>{" "}
							Include settled balances
						</label>
						{visible.length ? (
							<div className="receivables-table">
								<table>
									<thead>
										<tr>
											<th>Name / description</th>
											<th>Lent</th>
											<th>Repaid</th>
											<th>Outstanding</th>
										</tr>
									</thead>
									<tbody>
										{visible.map((item) => (
											<tr
												key={
													item.description === null
														? "unnamed"
														: `name:${item.description}`
												}
											>
												<th scope="row">
													{item.description ?? "Missing description"}
												</th>
												<td data-label="Lent">{money(item.lent)}</td>
												<td data-label="Repaid">{money(item.repaid)}</td>
												<td data-label="Outstanding">
													<strong>{money(item.outstanding)}</strong>
													{item.outstanding < 0 && (
														<small>Credit / overpayment</small>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p>
								{items.length
									? "No outstanding balances. Enable settled balances to see repayments."
									: "No transfers for this account yet."}
							</p>
						)}
						<p className="muted">
							Only transfers are included, not income or expenses. Missing
							descriptions are grouped separately. Negative balances indicate credit,
							not money owed.
						</p>
					</>
				)
			)}
		</section>
	);
}
