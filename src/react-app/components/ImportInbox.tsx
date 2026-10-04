import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/client";
import type {
	Account,
	Category,
	ImportReview,
	ImportUpload,
	MerchantRule,
	MoneyFormatter,
} from "../types";
import { errorMessage } from "../utils/errors";

type Tab = "pending" | "history" | "rules";
type Props = {
	accounts: Account[];
	categories: Category[];
	money: MoneyFormatter;
	onImported: () => Promise<void>;
	onAccounts: () => void;
};

const MAX_EMAIL_BYTES = 1024 * 1024;
const dateLabel = (date: string) =>
	new Date(date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function ReviewCard({
	item,
	accounts,
	categories,
	money,
	busy,
	onApprove,
	onSkip,
}: {
	item: ImportReview;
	accounts: Account[];
	categories: Category[];
	money: MoneyFormatter;
	busy: boolean;
	onApprove: (
		item: ImportReview,
		accountId: number,
		categoryId: number,
		saveRule: boolean,
	) => Promise<void>;
	onSkip: (item: ImportReview) => Promise<void>;
}) {
	const [accountDraft, setAccountDraft] = useState<string | null>(null);
	const [categoryDraft, setCategoryDraft] = useState<string | null>(null);
	const [saveRule, setSaveRule] = useState(false);
	const accountId = accountDraft ?? String(item.account_id ?? "");
	const categoryId = categoryDraft ?? String(item.suggested_category_id ?? "");
	const validAccount = accounts.some((account) => String(account.id) === accountId);
	const matchingCategories = categories.filter((category) => category.type === item.direction);
	const validCategory = matchingCategories.some((category) => String(category.id) === categoryId);
	const pending = item.status === "pending";
	const badge = pending
		? item.suggestion_source === "rule"
			? "Saved rule"
			: item.suggestion_source === "history"
				? "Suggested"
				: "Needs review"
		: item.status === "imported"
			? "Approved"
			: "Skipped";

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (validAccount && validCategory && !busy)
			void onApprove(item, Number(accountId), Number(categoryId), saveRule);
	}

	return (
		<article
			className="import-card"
			aria-label={`Import ${item.counterparty || "BCA transaction"}`}
		>
			<div className="import-card-heading">
				<div>
					<span
						className={`import-badge ${item.suggestion_source === "none" && pending ? "needs-review" : ""}`}
					>
						{badge}
					</span>
					<h4>{item.counterparty || "BCA transaction"}</h4>
					<p className="muted">
						{dateLabel(item.occurred_at)} ·{" "}
						{item.direction === "income" ? "Income" : "Expense"}
					</p>
				</div>
				<strong className={`import-amount ${item.direction}`}>
					{item.direction === "expense" ? "−" : "+"}
					{money(item.amount)}
				</strong>
			</div>
			{item.description && <p className="import-description">{item.description}</p>}
			{item.reference_number && (
				<p className="import-reference">Reference: {item.reference_number}</p>
			)}
			{pending ? (
				<form onSubmit={submit}>
					<p className="import-suggestion">{item.suggestion_reason}</p>
					<div className="import-review-fields">
						<label>
							Account
							<select
								value={validAccount ? accountId : ""}
								onChange={(event) => setAccountDraft(event.target.value)}
								required
								disabled={busy}
							>
								<option value="">Choose an account</option>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</label>
						<label>
							Category
							<select
								value={validCategory ? categoryId : ""}
								onChange={(event) => setCategoryDraft(event.target.value)}
								required
								disabled={busy}
							>
								<option value="">Choose a category</option>
								{matchingCategories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
							{matchingCategories.length === 0 && (
								<span className="muted">
									Add an {item.direction} category in Settings first.
								</span>
							)}
						</label>
					</div>
					<div className="import-review-footer">
						{item.can_save_rule ? (
							<label className="import-rule-checkbox">
								<input
									type="checkbox"
									checked={saveRule}
									onChange={(event) => setSaveRule(event.target.checked)}
									disabled={busy}
								/>
								Always use this category for this merchant
							</label>
						) : (
							<span />
						)}
						<div className="import-card-actions">
							<button
								className="cancel-button"
								type="button"
								onClick={() => void onSkip(item)}
								disabled={busy}
							>
								Skip
							</button>
							<button
								className="submit-button"
								type="submit"
								disabled={busy || !validAccount || !validCategory}
							>
								{busy ? "Saving…" : "Approve transaction"}
							</button>
						</div>
					</div>
				</form>
			) : (
				<p className="muted">
					{item.status === "imported"
						? item.transaction_id === null
							? "The approved transaction has since been removed."
							: "Added to your transactions."
						: "Skipped without adding a transaction."}
				</p>
			)}
		</article>
	);
}

function RuleCard({
	rule,
	categories,
	busy,
	onSave,
	onRemove,
}: {
	rule: MerchantRule;
	categories: Category[];
	busy: boolean;
	onSave: (rule: MerchantRule, categoryId: number) => Promise<void>;
	onRemove: (rule: MerchantRule) => Promise<void>;
}) {
	const [categoryDraft, setCategoryDraft] = useState<string | null>(null);
	const categoryId = categoryDraft ?? String(rule.category_id);
	return (
		<form
			className="import-rule-card"
			aria-label={`Rule for ${rule.merchant_name}`}
			onSubmit={(event) => {
				event.preventDefault();
				void onSave(rule, Number(categoryId));
			}}
		>
			<div>
				<h4>{rule.merchant_name}</h4>
				<p className="muted">
					{rule.direction === "income" ? "Income" : "Expense"} · exact merchant match
				</p>
			</div>
			<label>
				Category
				<select
					value={categoryId}
					required
					disabled={busy}
					onChange={(event) => setCategoryDraft(event.target.value)}
				>
					{categories
						.filter((category) => category.type === rule.direction)
						.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
				</select>
			</label>
			<div className="import-card-actions">
				<button
					className="submit-button"
					type="submit"
					disabled={busy || Number(categoryId) === rule.category_id}
				>
					Save rule
				</button>
				<button
					className="cancel-button"
					type="button"
					disabled={busy}
					onClick={() => void onRemove(rule)}
				>
					Remove rule
				</button>
			</div>
		</form>
	);
}

export function ImportInbox({ accounts, categories, money, onImported, onAccounts }: Props) {
	const client = useQueryClient();
	const [tab, setTab] = useState<Tab>("pending");
	const [accountDraft, setAccountDraft] = useState<string | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [uploadKey, setUploadKey] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const ledgerAccounts = accounts.filter((account) => account.valuation_mode !== "crypto");
	const preferredAccount =
		ledgerAccounts.find((account) => account.name.toLowerCase() === "bca") ?? ledgerAccounts[0];
	const accountId = accountDraft ?? String(preferredAccount?.id ?? "");
	const validAccount = ledgerAccounts.some((account) => String(account.id) === accountId);
	const imports = useQuery({
		queryKey: ["imports", tab === "history" ? "history" : "pending"],
		queryFn: ({ signal }) =>
			request<ImportReview[]>(
				`/imports?status=${tab === "history" ? "history" : "pending"}`,
				{ signal },
			),
		enabled: tab !== "rules",
	});
	const rules = useQuery({
		queryKey: ["merchant-rules"],
		queryFn: ({ signal }) => request<MerchantRule[]>("/imports/rules", { signal }),
		enabled: tab === "rules",
	});
	const query = tab === "rules" ? rules : imports;

	async function refresh() {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["imports"] }),
			client.invalidateQueries({ queryKey: ["merchant-rules"] }),
		]);
	}

	async function perform(action: () => Promise<void>, fallback: string) {
		if (busy) return;
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await action();
		} catch (reason) {
			setError(errorMessage(reason, fallback));
		} finally {
			setBusy(false);
		}
	}

	async function stage(body: BodyInit) {
		const result = await request<ImportUpload>(`/imports/bca?account_id=${accountId}`, {
			method: "POST",
			headers: { "Content-Type": "message/rfc822" },
			body,
		});
		setTab(result.item.status === "pending" ? "pending" : "history");
		setFile(null);
		setUploadKey((key) => key + 1);
		setNotice(
			result.duplicate
				? `This notification is already ${result.item.status === "pending" ? "in your inbox" : result.item.status === "imported" ? "approved" : "skipped"}. No duplicate was added.`
				: "Notification added to your inbox. Review it before adding it to your transactions.",
		);
		await refresh();
	}

	function upload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!file || !validAccount) return;
		if (
			file.size === 0 ||
			file.size > MAX_EMAIL_BYTES ||
			!file.name.toLowerCase().endsWith(".eml")
		) {
			setError("Choose a non-empty .eml file of 1 MB or less.");
			return;
		}
		void perform(() => stage(file), "Could not upload the BCA notification.");
	}

	async function trySample() {
		if (!validAccount) return;
		await perform(async () => {
			const response = await fetch("/samples/bca-fictional.eml");
			if (!response.ok) throw new Error("Could not load the sample notification.");
			await stage(await response.arrayBuffer());
		}, "Could not load the sample notification.");
	}

	async function approve(
		item: ImportReview,
		selectedAccount: number,
		categoryId: number,
		saveRule: boolean,
	) {
		await perform(async () => {
			const approved = await request<ImportReview>(`/imports/${item.id}/approve`, {
				method: "POST",
				body: JSON.stringify({
					account_id: selectedAccount,
					category_id: categoryId,
					save_rule: saveRule,
				}),
			});
			setNotice(
				approved.transaction_id === null
					? "This notification was already approved. Its transaction has since been removed."
					: "Transaction approved." + (saveRule ? " Merchant rule saved." : ""),
			);
			await Promise.all([refresh(), onImported()]);
		}, "Could not approve this transaction.");
	}

	async function skip(item: ImportReview) {
		await perform(async () => {
			await request(`/imports/${item.id}/dismiss`, { method: "POST" });
			setNotice("Notification skipped. No transaction was added.");
			await refresh();
		}, "Could not skip this notification.");
	}

	async function saveRule(rule: MerchantRule, categoryId: number) {
		await perform(async () => {
			await request(`/imports/rules/${rule.id}`, {
				method: "PATCH",
				body: JSON.stringify({ category_id: categoryId }),
			});
			setNotice("Merchant rule updated. Pending suggestions will use the new category.");
			await refresh();
		}, "Could not update the merchant rule.");
	}

	async function removeRule(rule: MerchantRule) {
		await perform(async () => {
			await request(`/imports/rules/${rule.id}`, { method: "DELETE" });
			setNotice("Merchant rule removed. Previous transactions are unchanged.");
			await refresh();
		}, "Could not remove the merchant rule.");
	}

	return (
		<div className="import-inbox">
			<section className="panel import-upload-panel" aria-labelledby="import-inbox-title">
				<div className="panel-heading">
					<div>
						<p className="eyebrow">BCA IMPORT</p>
						<h3 id="import-inbox-title">Import inbox</h3>
					</div>
					<span className="import-badge">Manual upload</span>
				</div>
				<p className="muted">
					Upload a BCA notification email, review its category, then approve it. Pending
					items do not affect your balances or reports.
				</p>
				{ledgerAccounts.length ? (
					<form className="import-upload-form" onSubmit={upload}>
						<label>
							Import into account
							<select
								required
								disabled={busy}
								value={validAccount ? accountId : ""}
								onChange={(event) => setAccountDraft(event.target.value)}
							>
								<option value="">Choose an account</option>
								{ledgerAccounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</label>
						<label>
							BCA email file (.eml)
							<input
								key={uploadKey}
								type="file"
								accept=".eml,message/rfc822"
								disabled={busy}
								onChange={(event) => {
									setFile(event.target.files?.[0] ?? null);
									setError("");
								}}
							/>
						</label>
						<button
							className="submit-button"
							type="submit"
							disabled={busy || !file || !validAccount}
						>
							{busy ? "Working…" : "Upload for review"}
						</button>
					</form>
				) : (
					<p className="import-empty">
						Add a bank account to start importing.{" "}
						<button type="button" className="cancel-button" onClick={onAccounts}>
							Go to accounts
						</button>
					</p>
				)}
				<div className="import-upload-help">
					<p>
						In Gmail, open the BCA email → More (⋮) → Download message. Upload the
						original .eml file here (up to 1 MB).
					</p>
					{ledgerAccounts.length > 0 && (
						<button
							className="import-sample-button"
							type="button"
							disabled={busy || !validAccount}
							onClick={() => void trySample()}
						>
							Try a fictional sample
						</button>
					)}
				</div>
				<p className="import-footnote">
					A sample becomes a ledger entry only if you approve it. This inbox uses manual
					uploads; automatic email imports are handled separately.
				</p>
			</section>
			<section
				className="panel import-review-panel"
				aria-label="Review imported notifications"
			>
				<div className="import-tabs" role="tablist" aria-label="Import views">
					{(
						[
							["pending", "Needs review"],
							["history", "History"],
							["rules", "Merchant rules"],
						] as const
					).map(([id, label]) => (
						<button
							key={id}
							role="tab"
							id={`import-tab-${id}`}
							aria-selected={tab === id}
							aria-controls="import-tab-panel"
							tabIndex={tab === id ? 0 : -1}
							type="button"
							disabled={busy}
							onClick={() => {
								setTab(id);
								setError("");
								setNotice("");
							}}
							onKeyDown={(event) => {
								const tabs: Tab[] = ["pending", "history", "rules"];
								let next: Tab | undefined;
								if (event.key === "ArrowRight")
									next = tabs[(tabs.indexOf(tab) + 1) % tabs.length];
								if (event.key === "ArrowLeft")
									next =
										tabs[(tabs.indexOf(tab) + tabs.length - 1) % tabs.length];
								if (event.key === "Home") next = "pending";
								if (event.key === "End") next = "rules";
								if (next) {
									event.preventDefault();
									setTab(next);
									document.getElementById(`import-tab-${next}`)?.focus();
								}
							}}
						>
							{label}
						</button>
					))}
				</div>
				{error && (
					<p role="alert" className="form-error">
						{error}
					</p>
				)}
				{notice && (
					<p role="status" className="success-message">
						{notice}
					</p>
				)}
				<div
					id="import-tab-panel"
					role="tabpanel"
					aria-labelledby={`import-tab-${tab}`}
					aria-busy={query.isFetching || busy}
				>
					{query.isLoading ? (
						<p role="status" className="muted">
							Loading {tab === "rules" ? "merchant rules" : "notifications"}…
						</p>
					) : query.error ? (
						<div role="alert" className="import-empty">
							<p>{errorMessage(query.error, "Could not load imports.")}</p>
							<button
								type="button"
								className="cancel-button"
								onClick={() => void query.refetch()}
							>
								Try again
							</button>
						</div>
					) : tab === "rules" ? (
						rules.data?.length ? (
							<div className="import-card-list">
								{rules.data.map((rule) => (
									<RuleCard
										key={rule.id}
										rule={rule}
										categories={categories}
										busy={busy}
										onSave={saveRule}
										onRemove={removeRule}
									/>
								))}
							</div>
						) : (
							<p className="import-empty">
								No merchant rules yet. Choose “Always use this category” when
								approving a notification to save one.
							</p>
						)
					) : imports.data?.length ? (
						<>
							<p className="muted">
								{imports.data.length} {tab === "pending" ? "pending" : "reviewed"}{" "}
								notification{imports.data.length === 1 ? "" : "s"}
								{imports.data.length === 100 ? " · Showing the latest 100" : ""}
							</p>
							<div className="import-card-list">
								{imports.data.map((item) => (
									<ReviewCard
										key={item.id}
										item={item}
										accounts={ledgerAccounts}
										categories={categories}
										money={money}
										busy={busy}
										onApprove={approve}
										onSkip={skip}
									/>
								))}
							</div>
						</>
					) : (
						<p className="import-empty">
							{tab === "pending"
								? "Your inbox is clear. Upload a notification above to start reviewing."
								: "No reviewed notifications yet. Approved and skipped items will appear here."}
						</p>
					)}
				</div>
			</section>
		</div>
	);
}
