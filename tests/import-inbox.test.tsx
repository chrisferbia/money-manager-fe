import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { ImportInbox } from "../src/react-app/components/ImportInbox";
import { AppShell } from "../src/react-app/components/AppShell";
import { request } from "../src/react-app/api/client";
import { createQueryClient } from "../src/react-app/api/queries";
import type { ImportReview, MerchantRule } from "../src/react-app/types";

vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
const accounts = [
	{
		id: 1,
		name: "BCA",
		type: "bank",
		sequence: 1,
		created_at: "2026-01-01",
		valuation_mode: "ledger" as const,
	},
	{
		id: 2,
		name: "Crypto",
		type: "investment",
		sequence: 2,
		created_at: "2026-01-01",
		valuation_mode: "crypto" as const,
	},
];
const categories = [
	{ id: 1, name: "Food", type: "expense" as const, sequence: 1, created_at: "2026-01-01" },
	{ id: 2, name: "Shopping", type: "expense" as const, sequence: 2, created_at: "2026-01-01" },
	{ id: 3, name: "Salary", type: "income" as const, sequence: 3, created_at: "2026-01-01" },
	{ id: 4, name: "Other", type: "expense" as const, sequence: 4, created_at: "2026-01-01" },
];
const item: ImportReview = {
	id: 1,
	account_id: 1,
	reference_number: "FICTIONAL-001",
	direction: "expense",
	amount: 35000,
	counterparty: "KEDAI CONTOH",
	description: "Fictional lunch",
	occurred_at: "2026-10-04T05:00:00Z",
	transaction_subtype: "transfer",
	status: "pending",
	transaction_id: null,
	received_at: "2026-10-04",
	reviewed_at: null,
	suggested_category_id: null,
	suggestion_source: "none",
	suggestion_reason: "Choose a category. No matching rule or previous approval.",
	can_save_rule: true,
};
let items: ImportReview[];
let rules: MerchantRule[];
let client: ReturnType<typeof createQueryClient>;
let onImported: ReturnType<typeof vi.fn>;

beforeEach(() => {
	items = [];
	rules = [];
	client = createQueryClient();
	client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
	onImported = vi.fn().mockResolvedValue(undefined);
	mockRequest.mockReset();
	mockRequest.mockImplementation(async (path, options) => {
		if (path.startsWith("/imports/bca")) {
			const duplicate = items.some((entry) => entry.id === 1);
			if (!duplicate) items = [...items, { ...item }];
			return { item: items.find((entry) => entry.id === 1), duplicate };
		}
		if (path.endsWith("/approve")) {
			const payload = JSON.parse(options?.body as string);
			const approved = { ...items[0], status: "imported" as const, transaction_id: 10 };
			items = [approved];
			if (payload.save_rule)
				rules = [
					{
						id: 1,
						merchant_name: "KEDAI CONTOH",
						direction: "expense",
						category_id: payload.category_id,
					},
				];
			return approved;
		}
		if (path.endsWith("/dismiss")) {
			items = items.map((entry) => ({ ...entry, status: "dismissed" }));
			return items[0];
		}
		if (path === "/imports/rules/1" && options?.method === "PATCH") {
			rules = rules.map((rule) => ({
				...rule,
				category_id: JSON.parse(options.body as string).category_id,
			}));
			return rules[0];
		}
		if (path === "/imports/rules/1" && options?.method === "DELETE") {
			rules = [];
			return undefined;
		}
		if (path === "/imports/rules") return rules;
		if (path.startsWith("/imports?"))
			return items.filter((entry) =>
				path.includes("history") ? entry.status !== "pending" : entry.status === "pending",
			);
		throw new Error(`Unexpected request: ${path}`);
	});
});

afterEach(() => {
	cleanup();
	client.clear();
	vi.restoreAllMocks();
});

function show(selectedAccounts = accounts) {
	render(
		<QueryClientProvider client={client}>
			<ImportInbox
				accounts={selectedAccounts}
				categories={categories}
				money={(value) => `Rp ${value}`}
				onImported={onImported}
				onAccounts={vi.fn()}
			/>
		</QueryClientProvider>,
	);
}

it("uploads an email, reviews category, approves once, and saves a rule only when selected", async () => {
	const user = userEvent.setup();
	show();
	await screen.findByText(/Your inbox is clear/);
	expect(screen.queryByRole("option", { name: "Crypto" })).toBeNull();
	const file = new File(["fictional BCA email"], "bca.eml", { type: "message/rfc822" });
	await user.upload(screen.getByLabelText("BCA email file (.eml)"), file);
	await user.click(screen.getByRole("button", { name: "Upload for review" }));
	const card = await screen.findByRole("article", { name: "Import KEDAI CONTOH" });
	expect(within(card).getByText("Needs review")).toBeTruthy();
	expect(
		within(card).getByRole("button", { name: "Approve transaction" }).hasAttribute("disabled"),
	).toBe(true);
	expect(within(card).queryByRole("option", { name: "Salary" })).toBeNull();
	await user.selectOptions(within(card).getByRole("combobox", { name: "Category" }), "1");
	await user.click(
		within(card).getByRole("checkbox", { name: "Always use this category for this merchant" }),
	);
	await user.click(within(card).getByRole("button", { name: "Approve transaction" }));
	await screen.findByText("Transaction approved. Merchant rule saved.");
	expect(mockRequest).toHaveBeenCalledWith(
		"/imports/1/approve",
		expect.objectContaining({
			method: "POST",
			body: JSON.stringify({ account_id: 1, category_id: 1, save_rule: true }),
		}),
	);
	expect(onImported).toHaveBeenCalledTimes(1);
	await user.click(screen.getByRole("tab", { name: "History" }));
	await screen.findByText("Approved");
	expect(screen.queryByRole("button", { name: "Approve transaction" })).toBeNull();
	await user.click(screen.getByRole("tab", { name: "Merchant rules" }));
	await screen.findByRole("form", { name: "Rule for KEDAI CONTOH" });
});

it("approves Other and displays its saved merchant rule", async () => {
	items = [{ ...item }];
	const user = userEvent.setup();
	show();
	const card = await screen.findByRole("article");
	await user.selectOptions(within(card).getByRole("combobox", { name: "Category" }), "4");
	await user.click(
		within(card).getByRole("checkbox", { name: "Always use this category for this merchant" }),
	);
	await user.click(within(card).getByRole("button", { name: "Approve transaction" }));
	await screen.findByText("Transaction approved. Merchant rule saved.");
	expect(mockRequest).toHaveBeenCalledWith(
		"/imports/1/approve",
		expect.objectContaining({
			body: JSON.stringify({ account_id: 1, category_id: 4, save_rule: true }),
		}),
	);
	await user.click(screen.getByRole("tab", { name: "Merchant rules" }));
	const rule = await screen.findByRole("form", { name: "Rule for KEDAI CONTOH" });
	expect(
		(within(rule).getByRole("combobox", { name: "Category" }) as HTMLSelectElement).value,
	).toBe("4");
});

it("lets users correct a suggestion without automatically saving a merchant rule", async () => {
	items = [
		{
			...item,
			suggested_category_id: 1,
			suggestion_source: "history",
			suggestion_reason: "Previously approved as Food. Please check it.",
		},
	];
	const user = userEvent.setup();
	show();
	const card = await screen.findByRole("article");
	expect(
		(within(card).getByRole("combobox", { name: "Category" }) as HTMLSelectElement).value,
	).toBe("1");
	await user.selectOptions(within(card).getByRole("combobox", { name: "Category" }), "2");
	await user.click(within(card).getByRole("button", { name: "Approve transaction" }));
	await screen.findByText("Transaction approved.");
	expect(mockRequest).toHaveBeenCalledWith(
		"/imports/1/approve",
		expect.objectContaining({
			body: JSON.stringify({ account_id: 1, category_id: 2, save_rule: false }),
		}),
	);
	expect(rules).toEqual([]);
});

it("skips without changing the ledger and presents skipped history", async () => {
	items = [
		{
			...item,
			can_save_rule: false,
			suggestion_reason: "This may be a transfer between your accounts.",
		},
	];
	const user = userEvent.setup();
	show();
	await screen.findByText(/This may be a transfer/);
	expect(screen.queryByRole("checkbox")).toBeNull();
	await user.click(screen.getByRole("button", { name: "Skip" }));
	await screen.findByText("Notification skipped. No transaction was added.");
	expect(onImported).not.toHaveBeenCalled();
	await user.click(screen.getByRole("tab", { name: "History" }));
	await screen.findByText("Skipped");
});

it("updates and removes a merchant rule", async () => {
	rules = [{ id: 1, merchant_name: "KEDAI CONTOH", direction: "expense", category_id: 1 }];
	const user = userEvent.setup();
	show();
	await user.click(screen.getByRole("tab", { name: "Merchant rules" }));
	await screen.findByRole("form", { name: "Rule for KEDAI CONTOH" });
	await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "2");
	await user.click(screen.getByRole("button", { name: "Save rule" }));
	await screen.findByText(/Merchant rule updated/);
	expect(rules[0].category_id).toBe(2);
	await user.click(screen.getByRole("button", { name: "Remove rule" }));
	await screen.findByText(/No merchant rules yet/);
});

it("keeps a failed approval available for retry without refreshing balances", async () => {
	items = [{ ...item, suggested_category_id: 1, suggestion_source: "rule" }];
	const implementation = mockRequest.getMockImplementation()!;
	mockRequest.mockImplementation(async (path, options) => {
		if (path.endsWith("/approve")) throw new Error("Could not save. Try again.");
		return implementation(path, options);
	});
	const user = userEvent.setup();
	show();
	await user.click(await screen.findByRole("button", { name: "Approve transaction" }));
	await screen.findByRole("alert");
	expect(screen.getByRole("alert").textContent).toContain("Could not save");
	expect(screen.getByRole("article")).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "Approve transaction" }).hasAttribute("disabled"),
	).toBe(false);
	expect(onImported).not.toHaveBeenCalled();
});

it("shows an existing upload without adding a duplicate notification", async () => {
	items = [{ ...item }];
	const user = userEvent.setup();
	show();
	await user.upload(
		screen.getByLabelText("BCA email file (.eml)"),
		new File(["email"], "bca.eml", { type: "message/rfc822" }),
	);
	await user.click(screen.getByRole("button", { name: "Upload for review" }));
	await screen.findByText(/No duplicate was added/);
	expect(screen.getAllByRole("article")).toHaveLength(1);
});

it("rejects oversized emails before sending them", async () => {
	const user = userEvent.setup();
	show();
	await user.upload(
		screen.getByLabelText("BCA email file (.eml)"),
		new File(["x".repeat(1024 * 1024 + 1)], "bca.eml", { type: "message/rfc822" }),
	);
	await user.click(screen.getByRole("button", { name: "Upload for review" }));
	await screen.findByText(/Choose a non-empty .eml/);
	expect(mockRequest.mock.calls.filter(([path]) => path.startsWith("/imports/bca"))).toHaveLength(
		0,
	);
});

it("offers account setup when there are no ledger accounts", async () => {
	show([accounts[1]]);
	await screen.findByText(/Add a bank account to start importing/);
	expect(screen.getByRole("button", { name: "Go to accounts" })).toBeTruthy();
	expect(screen.queryByLabelText("BCA email file (.eml)")).toBeNull();
});

it("keeps the import inbox out of the public demo navigation", () => {
	render(
		<AppShell
			demoMode
			view="dashboard"
			error=""
			notice=""
			loading={false}
			initialLoading={false}
			onAddTransaction={vi.fn()}
			onViewChange={vi.fn()}
			onDismissError={vi.fn()}
		>
			<p>Demo</p>
		</AppShell>,
	);
	expect(screen.queryByRole("button", { name: "Import inbox" })).toBeNull();
});

it("allows keyboard navigation between review tabs", async () => {
	const user = userEvent.setup();
	show();
	await waitFor(() =>
		expect(
			screen.getByRole("tab", { name: "Needs review" }).getAttribute("aria-selected"),
		).toBe("true"),
	);
	screen.getByRole("tab", { name: "Needs review" }).focus();
	await user.keyboard("{ArrowRight}");
	expect(screen.getByRole("tab", { name: "History" }).getAttribute("aria-selected")).toBe("true");
	expect(document.activeElement).toBe(screen.getByRole("tab", { name: "History" }));
});

it("shows when an approved transaction has been removed and offers no reapproval", async () => {
	items = [{ ...item, status: "imported", transaction_id: null }];
	const user = userEvent.setup();
	show();
	await user.click(screen.getByRole("tab", { name: "History" }));
	await screen.findByText("The approved transaction has since been removed.");
	expect(screen.queryByRole("button", { name: "Approve transaction" })).toBeNull();
});
