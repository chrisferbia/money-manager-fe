import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { CryptoPriceSettings } from "../src/react-app/components/CryptoPriceSettings";
import { createQueryClient } from "../src/react-app/api/queries";
import { request } from "../src/react-app/api/client";

vi.mock("../src/react-app/api/client", () => ({ request: vi.fn() }));
const mockRequest = vi.mocked(request);
let client: ReturnType<typeof createQueryClient>;
let storedMinutes: number;

beforeEach(() => {
	client = createQueryClient();
	client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
	storedMinutes = 10;
	mockRequest.mockReset();
	mockRequest.mockImplementation(async (_path, options) => {
		if (options?.method === "PATCH") {
			storedMinutes = JSON.parse(options.body as string).expiry_minutes;
		}
		return { expiry_minutes: storedMinutes };
	});
});

afterEach(() => {
	cleanup();
	client.clear();
	vi.restoreAllMocks();
});

function showSettings() {
	return render(
		<QueryClientProvider client={client}>
			<CryptoPriceSettings />
		</QueryClientProvider>,
	);
}

it("loads, saves, and reloads the persisted expiry and invalidates crypto data", async () => {
	const user = userEvent.setup();
	const invalidate = vi.spyOn(client, "invalidateQueries");
	const view = showSettings();
	const input = await screen.findByRole("spinbutton", { name: "Price expires after (minutes)" });
	expect((input as HTMLInputElement).value).toBe("10");
	expect(
		(screen.getByRole("button", { name: "Save price expiry" }) as HTMLButtonElement).disabled,
	).toBe(true);
	await user.clear(input);
	await user.type(input, "30");
	await user.click(screen.getByRole("button", { name: "Save price expiry" }));
	await screen.findByText("Crypto price expiry saved: 30 minutes.");
	expect(mockRequest).toHaveBeenCalledWith("/settings/crypto-prices", {
		method: "PATCH",
		body: JSON.stringify({ expiry_minutes: 30 }),
	});
	expect(invalidate).toHaveBeenCalledWith({ queryKey: ["accounts"] });
	expect(invalidate).toHaveBeenCalledWith({ queryKey: ["crypto-holdings"] });
	view.unmount();
	client.clear();
	showSettings();
	expect(((await screen.findByRole("spinbutton")) as HTMLInputElement).value).toBe("30");
});

it("does not allow empty, fractional, or out-of-range expiry", async () => {
	showSettings();
	const input = await screen.findByRole("spinbutton");
	for (const value of ["", "0", "1441", "1.5"]) {
		fireEvent.change(input, { target: { value } });
		expect(
			(screen.getByRole("button", { name: "Save price expiry" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	}
	expect(mockRequest.mock.calls.every(([, options]) => options?.method !== "PATCH")).toBe(true);
});

it("keeps the draft and shows a save error without changing the stored setting", async () => {
	const user = userEvent.setup();
	showSettings();
	const input = await screen.findByRole("spinbutton");
	mockRequest.mockRejectedValueOnce(new Error("Could not save price expiry"));
	await user.clear(input);
	await user.type(input, "5");
	await user.click(screen.getByRole("button", { name: "Save price expiry" }));
	expect((await screen.findByRole("alert")).textContent).toContain("Could not save");
	expect((input as HTMLInputElement).value).toBe("5");
	expect(storedMinutes).toBe(10);
	expect(client.getQueryData(["crypto-price-settings"])).toEqual({ expiry_minutes: 10 });
});

it("offers a retry if settings cannot be loaded", async () => {
	const user = userEvent.setup();
	mockRequest.mockRejectedValueOnce(new Error("Settings unavailable"));
	showSettings();
	await screen.findByText("Settings unavailable");
	expect(screen.queryByRole("spinbutton")).toBeNull();
	await user.click(screen.getByRole("button", { name: "Try again" }));
	await waitFor(() => expect(screen.getByRole("spinbutton")).toBeTruthy());
});
