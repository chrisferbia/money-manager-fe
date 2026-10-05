export type View = "dashboard" | "transactions" | "accounts" | "reports" | "settings";
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

export type CryptoPriceSettings = { expiry_minutes: number };
export type CryptoPriceRefresh = {
	requested_count: number;
	refreshed_count: number;
	failed_coin_ids: string[];
	holdings: CryptoHolding[];
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

export type EmailPreview = {
	parsed: {
		subject: string | null;
		sender: string | null;
		message_id: string | null;
		status: string | null;
		occurred_at: string | null;
		direction: "income" | "expense" | null;
		amount: number | null;
		counterparty: string | null;
		description: string | null;
		reference_number: string | null;
		transaction_subtype: string | null;
	};
	default_category: string;
	format_valid: boolean;
	warnings: string[];
	persisted: false;
};
