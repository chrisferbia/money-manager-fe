import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { useMoneyManagerActions } from "../src/react-app/hooks/useMoneyManagerActions";
import { request } from "../src/react-app/api/client";

vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
beforeEach(() => {
	mockRequest.mockReset();
	mockRequest.mockResolvedValue(undefined);
	vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function setup(kind: "account" | "category") {
	const dependencies: Parameters<typeof useMoneyManagerActions>[0] = {
		accounts: [],
		filters: { account: "", category: "", type: "", from: "", to: "" },
		refreshAccounts: vi.fn().mockResolvedValue(undefined),
		refreshCategories: vi.fn().mockResolvedValue(undefined),
		refreshTransactions: vi.fn().mockResolvedValue(undefined),
		setError: vi.fn(),
		setNotice: vi.fn(),
		setSaving: vi.fn(),
		setView: vi.fn(),
		setEntry: vi.fn(),
		setEditing: vi.fn(),
		setAccountDraft: vi.fn(),
		setEditingAccount: vi.fn(),
		setCategoryDraft: vi.fn(),
		setEditingCategory: vi.fn(),
	};
	const { result } = renderHook(() => useMoneyManagerActions(dependencies));
	const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
	const account = { id: 7, name: "Wallet", type: "cash", sequence: 1, created_at: "2026-01-01" };
	const category = {
		id: 7,
		name: "Food",
		type: "expense" as const,
		sequence: 1,
		created_at: "2026-01-01",
	};
	return {
		dependencies,
		result,
		event,
		path: kind === "account" ? "/accounts" : "/categories",
		label: kind === "account" ? "Account" : "Category",
		refresh: kind === "account" ? dependencies.refreshAccounts : dependencies.refreshCategories,
		otherRefresh:
			kind === "account" ? dependencies.refreshCategories : dependencies.refreshAccounts,
		resetDraft:
			kind === "account" ? dependencies.setAccountDraft : dependencies.setCategoryDraft,
		resetEditing:
			kind === "account" ? dependencies.setEditingAccount : dependencies.setEditingCategory,
		save: (editing = false, changes: { name?: string; sequence?: string } = {}) =>
			kind === "account"
				? result.current.saveAccount(
						event,
						{ name: "  Wallet  ", type: "cash", sequence: "2", ...changes },
						editing ? account : null,
					)
				: result.current.saveCategory(
						event,
						{ name: "  Food  ", type: "expense", sequence: "2", ...changes },
						editing ? category : null,
					),
		remove: () =>
			kind === "account"
				? result.current.deleteAccount(account)
				: result.current.deleteCategory(category),
		pending: () =>
			kind === "account"
				? result.current.deletingAccountId
				: result.current.deletingCategoryId,
	};
}

for (const kind of ["account", "category"] as const) {
	describe(`${kind} actions through the public hook`, () => {
		it.each([false, true])(
			"saves with editing=%s and refreshes only its own data",
			async (editing) => {
				const context = setup(kind);
				await act(async () => {
					expect(await context.save(editing)).toBe(true);
				});
				const payload =
					kind === "account"
						? { name: "Wallet", type: "cash", ...(editing ? { sequence: 2 } : {}) }
						: { name: "Food", ...(editing ? { sequence: 2 } : { type: "expense" }) };
				expect(mockRequest).toHaveBeenCalledWith(context.path + (editing ? "/7" : ""), {
					method: editing ? "PATCH" : "POST",
					body: JSON.stringify(payload),
				});
				expect(context.event.preventDefault).toHaveBeenCalledOnce();
				expect(context.refresh).toHaveBeenCalledOnce();
				expect(context.otherRefresh).not.toHaveBeenCalled();
				expect(context.dependencies.refreshTransactions).not.toHaveBeenCalled();
				expect(context.resetDraft).toHaveBeenCalledWith({
					name: "",
					type: kind === "account" ? "cash" : "expense",
					sequence: "",
				});
				expect(context.resetEditing).toHaveBeenCalledWith(null);
				expect(context.dependencies.setNotice).toHaveBeenCalledWith(
					`${context.label} ${editing ? "updated" : "added"}.`,
				);
				expect(context.dependencies.setSaving).toHaveBeenNthCalledWith(1, true);
				expect(context.dependencies.setSaving).toHaveBeenLastCalledWith(false);
			},
		);
		it.each([{ name: "  " }, { sequence: "0" }, { sequence: "1.5" }])(
			"rejects invalid input %j before requesting",
			async (changes) => {
				const context = setup(kind);
				await act(async () => {
					expect(await context.save(true, changes)).toBe(false);
				});
				expect(mockRequest).not.toHaveBeenCalled();
				expect(context.dependencies.setError).toHaveBeenCalled();
				expect(context.resetDraft).not.toHaveBeenCalled();
			},
		);
		it("keeps the draft and clears saving after a failed save", async () => {
			const context = setup(kind);
			mockRequest.mockRejectedValueOnce(new Error("Save rejected"));
			await act(async () => {
				expect(await context.save()).toBe(false);
			});
			expect(context.dependencies.setError).toHaveBeenCalledWith("Save rejected");
			expect(context.dependencies.setSaving).toHaveBeenLastCalledWith(false);
			expect(context.resetDraft).not.toHaveBeenCalled();
			expect(context.resetEditing).not.toHaveBeenCalled();
			expect(context.refresh).not.toHaveBeenCalled();
			expect(context.dependencies.setNotice).not.toHaveBeenCalled();
		});
		it("does nothing when deletion is cancelled", async () => {
			const context = setup(kind);
			vi.mocked(window.confirm).mockReturnValue(false);
			await act(async () => {
				await context.remove();
			});
			expect(window.confirm).toHaveBeenCalledOnce();
			expect(mockRequest).not.toHaveBeenCalled();
			expect(context.refresh).not.toHaveBeenCalled();
			expect(context.pending()).toBeNull();
		});
		it("tracks the pending deletion and refreshes after success", async () => {
			const context = setup(kind);
			let resolve!: () => void;
			mockRequest.mockImplementationOnce(
				() =>
					new Promise<void>((done) => {
						resolve = done;
					}),
			);
			let pending!: Promise<void>;
			act(() => {
				pending = context.remove();
			});
			expect(context.pending()).toBe(7);
			expect(context.refresh).not.toHaveBeenCalled();
			await act(async () => {
				resolve();
				await pending;
			});
			expect(mockRequest).toHaveBeenCalledWith(`${context.path}/7`, { method: "DELETE" });
			expect(context.refresh).toHaveBeenCalledOnce();
			expect(context.otherRefresh).not.toHaveBeenCalled();
			expect(context.dependencies.setNotice).toHaveBeenCalledWith(
				`${context.label} deleted.`,
			);
			expect(context.pending()).toBeNull();
		});
		it("clears the pending deletion and reports failures", async () => {
			const context = setup(kind);
			mockRequest.mockRejectedValueOnce(new Error("Still in use"));
			await act(async () => {
				await context.remove();
			});
			expect(context.dependencies.setError).toHaveBeenCalledWith("Still in use");
			expect(context.pending()).toBeNull();
			expect(context.refresh).not.toHaveBeenCalled();
			expect(context.dependencies.setNotice).not.toHaveBeenCalled();
		});
	});
}
