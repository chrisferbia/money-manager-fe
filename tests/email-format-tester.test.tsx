import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { EmailFormatTester } from "../src/react-app/components/EmailFormatTester";
import App from "../src/react-app/App";
import { createQueryClient } from "../src/react-app/api/queries";
import { request } from "../src/react-app/api/client";
import type { EmailPreview } from "../src/react-app/types";

vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
const result: EmailPreview = {
	parsed: {
		amount: 35000,
		occurred_at: "2026-10-04T05:00:00Z",
		direction: "expense",
		counterparty: "KEDAI CONTOH (FICTIONAL)",
		description: "Fictional lunch",
		reference_number: "FICTIONAL-001",
		status: "Successful",
		transaction_subtype: "transfer",
		sender: "bca@bca.co.id",
		subject: "Internet Transaction Journal",
		message_id: "<fictional@example.invalid>",
	},
	default_category: "Other",
	format_valid: true,
	warnings: [],
	persisted: false,
};
let client: ReturnType<typeof createQueryClient>;

beforeEach(() => {
	window.location.hash = "settings";
	mockRequest.mockReset();
	mockRequest.mockImplementation(async (path) =>
		path === "/email-tools/bca/preview" ? result : [],
	);
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
	);
	client = createQueryClient();
	client.setDefaultOptions({ queries: { retry: false } });
});
afterEach(() => {
	cleanup();
	client.clear();
	vi.unstubAllGlobals();
	window.location.hash = "";
});

it("does not fetch or save anything on opening the tester", () => {
	render(<EmailFormatTester />);
	expect(mockRequest).not.toHaveBeenCalled();
	expect(screen.getByRole("button", { name: "Test email format" }).hasAttribute("disabled")).toBe(
		true,
	);
	expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
	expect(screen.queryByLabelText(/account/i)).toBeNull();
	expect(screen.queryByText("Merchant rules")).toBeNull();
});

it("uploads only to the non-persisting parser and shows the default Other category", async () => {
	const user = userEvent.setup();
	render(<EmailFormatTester />);
	const file = new File(["fictional email"], "bca.eml", { type: "message/rfc822" });
	await user.upload(screen.getByLabelText("BCA email file (.eml)"), file);
	await user.click(screen.getByRole("button", { name: "Test email format" }));
	expect(await screen.findByText("Email parsed. Nothing was saved.")).toBeTruthy();
	expect(screen.getByText("Other")).toBeTruthy();
	expect(screen.getByText("KEDAI CONTOH (FICTIONAL)")).toBeTruthy();
	expect(screen.getByText(/04\/10\/2026, 12:00:00 WIB/)).toBeTruthy();
	expect(mockRequest).toHaveBeenCalledExactlyOnceWith("/email-tools/bca/preview", {
		method: "POST",
		headers: { "Content-Type": "message/rfc822" },
		body: file,
	});
});

it("can test the same sample repeatedly without needing an account", async () => {
	const user = userEvent.setup();
	render(<EmailFormatTester />);
	await user.click(screen.getByRole("button", { name: "Try a fictional sample" }));
	await screen.findByText("Parsed result");
	await user.click(screen.getByRole("button", { name: "Try a fictional sample" }));
	await screen.findByText("Parsed result");
	expect(mockRequest).toHaveBeenCalledTimes(2);
	expect(mockRequest.mock.calls.every(([path]) => path === "/email-tools/bca/preview")).toBe(
		true,
	);
});

it("shows parser errors and clears a previous result", async () => {
	const user = userEvent.setup();
	render(<EmailFormatTester />);
	await user.click(screen.getByRole("button", { name: "Try a fictional sample" }));
	await screen.findByText("Parsed result");
	mockRequest.mockRejectedValueOnce(
		new Error("Could not read this BCA notification: Missing amount"),
	);
	await user.click(screen.getByRole("button", { name: "Try a fictional sample" }));
	expect(await screen.findByRole("alert")).toHaveProperty(
		"textContent",
		"Could not read this BCA notification: Missing amount",
	);
	expect(screen.queryByText("Parsed result")).toBeNull();
});

it.each([
	new File([], "empty.eml"),
	new File(["x"], "wrong.txt"),
	new File([new Uint8Array(1024 * 1024 + 1)], "large.eml"),
])("rejects invalid files locally: $name", async (file) => {
	const user = userEvent.setup({ applyAccept: false });
	render(<EmailFormatTester />);
	await user.upload(screen.getByLabelText("BCA email file (.eml)"), file);
	await user.click(screen.getByRole("button", { name: "Test email format" }));
	expect(await screen.findByRole("alert")).toHaveProperty(
		"textContent",
		"Choose a non-empty .eml file of 1 MB or less.",
	);
	expect(mockRequest).not.toHaveBeenCalled();
});

it("shows warnings when the parser reads a failed transaction", async () => {
	mockRequest.mockResolvedValueOnce({
		...result,
		format_valid: false,
		warnings: [
			"Transaction status is Failed: automatic import would not create a transaction.",
		],
	});
	render(<EmailFormatTester />);
	await userEvent.setup().click(screen.getByRole("button", { name: "Try a fictional sample" }));
	expect(await screen.findByText("Needs attention")).toBeTruthy();
	expect(screen.getByRole("alert").textContent).toContain("Transaction status is Failed");
});

it("shows sample fetch errors without calling the parser", async () => {
	vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
	render(<EmailFormatTester />);
	await userEvent.setup().click(screen.getByRole("button", { name: "Try a fictional sample" }));
	expect(await screen.findByRole("alert")).toHaveProperty(
		"textContent",
		"Could not load the sample notification.",
	);
	expect(mockRequest).not.toHaveBeenCalled();
});

it("lives in Settings, removes Import inbox navigation, and maps old bookmarks safely", async () => {
	window.location.hash = "imports";
	render(
		<QueryClientProvider client={client}>
			<App />
		</QueryClientProvider>,
	);
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect(screen.getByRole("heading", { name: "Email format tester" })).toBeTruthy();
	const nav = within(screen.getByRole("navigation", { name: "Main navigation" }));
	expect(nav.queryByRole("button", { name: "Import inbox" })).toBeNull();
	expect(nav.getByRole("button", { name: "Settings" }).className).toBe("selected");
	expect(
		mockRequest.mock.calls.every(
			([path]) => !path.startsWith("/imports") && !path.startsWith("/email-tools"),
		),
	).toBe(true);
});

it("keeps the tester out of the anonymous demo, including legacy bookmarks", async () => {
	window.location.hash = "imports";
	render(
		<QueryClientProvider client={client}>
			<App demoMode />
		</QueryClientProvider>,
	);
	await waitFor(() => expect(screen.queryByText("Loading your ledger")).toBeNull());
	expect(screen.queryByRole("heading", { name: "Email format tester" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
});
