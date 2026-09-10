// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { EntryForm, Transaction, TransactionSort } from "../src/react-app/types";
import {
	amountInIdr,
	createTransactionPayload,
	createTransferPayload,
	entryFromTransaction,
	sortTransactions,
	updateTransactionPayload,
	validateEntry,
} from "../src/react-app/utils/transactions";

function entry(changes: Partial<EntryForm> = {}): EntryForm {
	return {
		type: "expense",
		accountId: "12",
		destinationId: "",
		categoryId: "3",
		amount: "15000",
		counterparty: "  Cafe  ",
		description: "  Lunch  ",
		date: "2026-09-11T00:30",
		...changes,
	};
}

function transaction(changes: Partial<Transaction> = {}): Transaction {
	return {
		id: 1,
		type: "expense",
		account_id: 12,
		category_id: 3,
		related_account_id: null,
		amount: 15000,
		counterparty: "Cafe",
		description: "Lunch",
		occurred_at: "2026-09-10T17:30:00Z",
		created_at: "2026-09-11T02:00:00Z",
		transaction_subtype: null,
		...changes,
	};
}

describe("transaction validation", () => {
	it.each(["", "0", "-1", "abc", "Infinity", "NaN"])("rejects invalid amount %j", (amount) => {
		expect(validateEntry(entry({ amount }))).toBe(
			"Account, date and time, and a positive amount are required.",
		);
	});
	it.each<Partial<EntryForm>>([{ accountId: "" }, { date: "" }, { date: "not-a-date" }])(
		"rejects missing or invalid required fields: %j",
		(changes) => {
			expect(validateEntry(entry(changes))).not.toBeNull();
		},
	);
	it("requires an expense category", () => {
		expect(validateEntry(entry({ categoryId: "" }))).toBe(
			"Expense transactions require a category.",
		);
	});
	it.each<Partial<EntryForm>>([
		{},
		{ type: "income", categoryId: "" },
		{ type: "income", categoryId: "3" },
		{ type: "transfer", categoryId: "", destinationId: "24" },
	])("accepts valid expenses, income, and transfers: %j", (changes) => {
		expect(validateEntry(entry(changes))).toBeNull();
	});
	it.each(["", "12"])("rejects transfer destination %j", (destinationId) => {
		expect(validateEntry(entry({ type: "transfer", destinationId }))).toBe(
			"Choose a different destination account for the transfer.",
		);
	});
});

describe("whole-IDR amounts", () => {
	// These document current rounding behavior; they do not introduce a new money policy.
	it.each([
		["1", 1],
		["1000.49", 1000],
		["1000.50", 1001],
		["1000.99", 1001],
		["1000000000000", 1000000000000],
	])("converts %s to %i IDR consistently in the saved payload", (amount, expected) => {
		expect(amountInIdr(entry({ amount }))).toBe(expected);
		expect(createTransactionPayload(entry({ amount })).amount).toBe(expected);
	});
	it("rejects a positive fraction that rounds to zero", () => {
		expect(validateEntry(entry({ amount: "0.49" }))).not.toBeNull();
	});
});

describe("API payloads", () => {
	it("creates an expense with numeric IDs, trimmed text, and a UTC instant", () => {
		expect(createTransactionPayload(entry())).toEqual({
			type: "expense",
			account_id: 12,
			category_id: 3,
			amount: 15000,
			counterparty: "Cafe",
			description: "Lunch",
			occurred_at: "2026-09-10T17:30:00.000Z",
		});
	});
	it("sends empty optional income fields as null", () => {
		expect(
			createTransactionPayload(
				entry({ type: "income", categoryId: "", description: "  ", counterparty: "" }),
			),
		).toMatchObject({
			type: "income",
			category_id: null,
			description: null,
			counterparty: null,
		});
	});
	it("keeps an optional income category when supplied", () => {
		expect(createTransactionPayload(entry({ type: "income" })).category_id).toBe(3);
	});
	it("creates a transfer with both accounts and no expense category", () => {
		expect(createTransferPayload(entry({ type: "transfer", destinationId: "24" }))).toEqual({
			type: "transfer",
			account_id: 12,
			related_account_id: 24,
			amount: 15000,
			counterparty: "Cafe",
			description: "Lunch",
			occurred_at: "2026-09-10T17:30:00.000Z",
		});
	});
	it("clears the old category when changing an expense into a transfer", () => {
		const draft = entryFromTransaction(transaction());
		expect(
			updateTransactionPayload({ ...draft, type: "transfer", destinationId: "24" }),
		).toMatchObject({
			type: "transfer",
			related_account_id: 24,
			category_id: null,
		});
	});
	it.each(["expense", "income"] as const)(
		"clears the old destination when changing a transfer into %s",
		(type) => {
			const draft = entryFromTransaction(
				transaction({ type: "transfer", category_id: null, related_account_id: 24 }),
			);
			expect(updateTransactionPayload({ ...draft, type, categoryId: "3" })).toMatchObject({
				type,
				related_account_id: null,
				category_id: 3,
			});
		},
	);
	it("explicitly clears an income category during editing", () => {
		expect(
			updateTransactionPayload(entry({ type: "income", categoryId: "" })).category_id,
		).toBeNull();
	});
});

describe("editing and local date round-trips", () => {
	it("fills an expense edit form with local time and string IDs", () => {
		expect(entryFromTransaction(transaction())).toEqual(
			entry({ counterparty: "Cafe", description: "Lunch" }),
		);
	});
	it("fills a transfer edit form and converts null text/category fields to empty strings", () => {
		expect(
			entryFromTransaction(
				transaction({
					type: "transfer",
					related_account_id: 24,
					category_id: null,
					counterparty: null,
					description: null,
				}),
			),
		).toMatchObject({
			type: "transfer",
			destinationId: "24",
			categoryId: "",
			counterparty: "",
			description: "",
		});
	});
	it.each([
		["2026-09-10T17:30:00Z", "2026-09-11T00:30", "2026-09-10T17:30:00.000Z"],
		["2026-12-31T17:00:00Z", "2027-01-01T00:00", "2026-12-31T17:00:00.000Z"],
		["2028-02-29T16:59:00Z", "2028-02-29T23:59", "2028-02-29T16:59:00.000Z"],
		["2026-09-11T00:30:00+07:00", "2026-09-11T00:30", "2026-09-10T17:30:00.000Z"],
	])("preserves minute-precision instant %s through editing", (instant, local, expected) => {
		const draft = entryFromTransaction(transaction({ occurred_at: instant }));
		expect(draft.date).toBe(local);
		expect(updateTransactionPayload(draft).occurred_at).toBe(expected);
	});
});

describe("transaction sorting", () => {
	const rows = [
		transaction({
			id: 1,
			occurred_at: "2026-09-01T00:00:00Z",
			created_at: "2026-09-03T00:00:00Z",
		}),
		transaction({
			id: 2,
			occurred_at: "2026-09-03T00:00:00Z",
			created_at: "2026-09-01T00:00:00Z",
		}),
		transaction({
			id: 3,
			occurred_at: "2026-09-02T00:00:00Z",
			created_at: "2026-09-02T00:00:00Z",
		}),
	];
	it.each<[TransactionSort, number[]]>([
		["occurred-desc", [2, 3, 1]],
		["occurred-asc", [1, 3, 2]],
		["created-desc", [1, 3, 2]],
		["created-asc", [2, 3, 1]],
	])("sorts by %s without mutating the input", (sort, expected) => {
		const frozen = Object.freeze([...rows]);
		expect(
			sortTransactions(frozen as unknown as Transaction[], sort).map((row) => row.id),
		).toEqual(expected);
		expect(frozen.map((row) => row.id)).toEqual([1, 2, 3]);
	});
	it("defaults to newest transaction date first", () => {
		expect(sortTransactions(rows).map((row) => row.id)).toEqual([2, 3, 1]);
	});
	it.each<[TransactionSort, number[]]>([
		["occurred-desc", [3, 2, 1]],
		["occurred-asc", [1, 2, 3]],
		["created-desc", [3, 2, 1]],
		["created-asc", [1, 2, 3]],
	])("breaks date ties with the other timestamp, then ID for %s", (sort, expected) => {
		const fallback = sort.startsWith("occurred") ? "created_at" : "occurred_at";
		const tied = [
			transaction({ id: 2 }),
			transaction({ id: 1 }),
			transaction({ id: 3, [fallback]: "2026-10-01T00:00:00Z" }),
		];
		expect(sortTransactions(tied, sort).map((row) => row.id)).toEqual(expected);
	});
	it("handles empty input", () => {
		expect(sortTransactions([])).toEqual([]);
	});
});
