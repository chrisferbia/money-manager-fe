export type View = "dashboard" | "transactions" | "imports" | "accounts" | "reports" | "settings";
export type EntryType = "income" | "expense" | "transfer";
export type DisplayCurrency = "IDR" | "USD";
export type TransactionSort = "occurred-desc" | "occurred-asc" | "created-desc" | "created-asc";

export type Account = {
	id: number;
	name: string;
	type: string;
	sequence: number;
	created_at: string;
	valuation_mode?: "ledger" | "crypto";
	balance?: number | null;
};

export type CryptoCoin = { coin_id: string; name: string; symbol: string };

export type CryptoHolding = CryptoCoin & {
	id: number;
	account_id: number;
	quantity: string;
	price_idr: string | null;
	value_idr: number | null;
	provider_updated_at: string | null;
	fetched_at: string | null;
	price_status: "fresh" | "stale" | "unavailable";
};

export type Category = {
	id: number;
	name: string;
	type: "income" | "expense";
	sequence: number;
	monthly_budget?: number | null;
	created_at: string;
};

export type Transaction = {
	id: number;
	type: EntryType;
	account_id: number;
	category_id: number | null;
	related_account_id: number | null;
	amount: number;
	counterparty: string | null;
	description: string | null;
	occurred_at: string;
	created_at: string;
	transaction_subtype: string | null;
};

export type ReportItem = {
	id: number;
	name: string;
	total: number;
};

export type SavingsHistoryPoint = {
	month: string;
	balance: number;
	change: number;
};

export type SavingsHistoryReport = {
	account_count: number;
	months: SavingsHistoryPoint[];
};

export type EntryForm = {
	type: EntryType;
	accountId: string;
	destinationId: string;
	categoryId: string;
	amount: string;
	counterparty: string;
	description: string;
	date: string;
};

export type CategoryDraft = {
	name: string;
	type: "income" | "expense";
	sequence: string;
	monthlyBudget: string;
};

export type AccountDraft = {
	name: string;
	type: string;
	sequence: string;
	valuationMode: "ledger" | "crypto";
};

export type DashboardFilters = {
	account: string;
	type: string;
	category: string;
	from: string;
	to: string;
};

export type MoneyFormatter = (amount: number) => string;

export type ImportReview = {
	id: number;
	account_id: number | null;
	reference_number: string | null;
	direction: "income" | "expense";
	amount: number;
	counterparty: string | null;
	description: string | null;
	occurred_at: string;
	transaction_subtype: string | null;
	status: "pending" | "imported" | "dismissed";
	transaction_id: number | null;
	received_at: string;
	reviewed_at: string | null;
	suggested_category_id: number | null;
	suggestion_source: "none" | "rule" | "history";
	suggestion_reason: string;
	can_save_rule: boolean;
};

export type ImportUpload = { item: ImportReview; duplicate: boolean };

export type MerchantRule = {
	id: number;
	merchant_name: string;
	direction: "income" | "expense";
	category_id: number;
};
