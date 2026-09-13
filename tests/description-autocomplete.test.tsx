import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DescriptionAutocomplete } from "../src/react-app/components/DescriptionAutocomplete";
import { request } from "../src/react-app/api/client";
vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
const clients: QueryClient[] = [];
afterEach(() => {
	cleanup();
	clients.forEach((c) => c.clear());
	mockRequest.mockReset();
});
function setup(open = true) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(client);
	function Form() {
		const [value, setValue] = useState("");
		return (
			<form onSubmit={(e) => e.preventDefault()}>
				<DescriptionAutocomplete value={value} onChange={setValue} formOpen={open} />
				<button>Save</button>
			</form>
		);
	}
	render(
		<QueryClientProvider client={client}>
			<Form />
		</QueryClientProvider>,
	);
	return screen.getByRole("combobox");
}
it("loads only on focus, preserves case variants, and selects with keyboard", async () => {
	mockRequest.mockResolvedValue(["Coffee", "coffee"]);
	const input = setup();
	expect(mockRequest).not.toHaveBeenCalled();
	fireEvent.focus(input);
	await screen.findByRole("option", { name: "Coffee", exact: true });
	expect(mockRequest.mock.calls[0][0]).toBe("/transactions/descriptions?limit=20");
	expect(screen.getAllByRole("option")).toHaveLength(2);
	Element.prototype.scrollIntoView = vi.fn();
	fireEvent.keyDown(input, { key: "ArrowUp" });
	fireEvent.keyDown(input, { key: "Enter" });
	expect((input as HTMLInputElement).value).toBe("coffee");
	expect(screen.queryByRole("listbox")).toBeNull();
});
it("debounces, encodes literal search, and hides old results", async () => {
	let resolveOld!: (value: string[]) => void;
	mockRequest.mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveOld = resolve;
			}),
	);
	const input = setup();
	fireEvent.focus(input);
	await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
	fireEvent.change(input, { target: { value: " %_& " } });
	expect(mockRequest).toHaveBeenCalledTimes(1);
	mockRequest.mockResolvedValue(["%_& result"]);
	resolveOld(["Old result"]);
	expect(screen.queryByRole("option", { name: "Old result" })).toBeNull();
	await screen.findByRole("option", { name: "%_& result" });
	const url = mockRequest.mock.calls.at(-1)![0];
	expect(new URLSearchParams(url.split("?")[1]).get("q")).toBe("%_&");
});
it("dismisses with Escape and Tab without changing free text", async () => {
	mockRequest.mockResolvedValue(["Coffee"]);
	const input = setup();
	fireEvent.focus(input);
	await screen.findByRole("option");
	fireEvent.keyDown(input, { key: "Escape" });
	expect(screen.queryByRole("listbox")).toBeNull();
	fireEvent.change(input, { target: { value: "New description" } });
	await screen.findByRole("option");
	fireEvent.keyDown(input, { key: "Tab" });
	expect((input as HTMLInputElement).value).toBe("New description");
	expect(screen.queryByRole("listbox")).toBeNull();
});
it("selects with a pointer and leaves failures nonblocking", async () => {
	mockRequest.mockResolvedValue(["Coffee"]);
	const input = setup();
	fireEvent.focus(input);
	fireEvent.click(await screen.findByRole("option"));
	expect((input as HTMLInputElement).value).toBe("Coffee");
	mockRequest.mockRejectedValue(new Error("Unavailable"));
	fireEvent.change(input, { target: { value: "Anything" } });
	await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
	expect(screen.queryByRole("alert")).toBeNull();
	expect(screen.queryByRole("listbox")).toBeNull();
	expect((input as HTMLInputElement).value).toBe("Anything");
});
it("does not request suggestions while closed", () => {
	const input = setup(false);
	fireEvent.focus(input);
	expect(mockRequest).not.toHaveBeenCalled();
});

it("invalidates every suggestion search after transaction changes without eager requests", async () => {
	const { renderHook, act } = await import("@testing-library/react");
	const { useMoneyManagerData } = await import("../src/react-app/hooks/useMoneyManagerData");
	mockRequest.mockResolvedValue([]);
	const client = new QueryClient();
	clients.push(client);
	client.setQueryData(["description-suggestions", ""], ["Coffee"]);
	client.setQueryData(["description-suggestions", "co"], ["Coffee"]);
	const { result } = renderHook(() => useMoneyManagerData("settings"), {
		wrapper: ({ children }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	});
	await act(async () => {
		await result.current.refreshTransactions();
	});
	expect(client.getQueryState(["description-suggestions", ""])?.isInvalidated).toBe(true);
	expect(client.getQueryState(["description-suggestions", "co"])?.isInvalidated).toBe(true);
	expect(mockRequest.mock.calls.some(([path]) => path.includes("/descriptions"))).toBe(false);
});
