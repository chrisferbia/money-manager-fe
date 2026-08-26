export type View = "dashboard" | "transactions" | "accounts" | "reports" | "settings";
export type EntryType = "income" | "expense" | "transfer";
export type DisplayCurrency = "IDR" | "USD";

export type Account = {
	id: number;
	name: string;
	type: string;
	created_at: string;
	balance?: number;
};

export type Category = {
	id: number;
	name: string;
	type: "income" | "expense";
	created_at: string;
};

export type Transaction = {
	id: number;
	type: EntryType;
	account_id: number;
	category_id: number | null;
	related_account_id: number | null;
	amount: number;
	description: string | null;
	occurred_at: string;
	created_at: string;
};

export type ReportItem = {
	id: number;
	name: string;
	total: number;
};

export type EntryForm = {
	type: EntryType;
	accountId: string;
	destinationId: string;
	categoryId: string;
	amount: string;
	description: string;
	date: string;
};

export type CategoryDraft = {
	name: string;
	type: "income" | "expense";
};

export type DashboardFilters = {
	account: string;
	type: string;
	category: string;
	from: string;
	to: string;
};

export type MoneyFormatter = (amount: number) => string;
