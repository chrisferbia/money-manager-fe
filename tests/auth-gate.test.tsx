import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren, ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthGate } from "../src/react-app/components/AuthGate";
import { request, setAccessTokenProvider, setDemoMode } from "../src/react-app/api/client";

const auth = vi.hoisted(() => ({ signedIn: false, userId: null as string | null }));
const getToken = vi.hoisted(() => async () => "session-token");

vi.mock("@clerk/react", () => ({
	ClerkProvider: ({ children }: PropsWithChildren) => <>{children}</>,
	SignIn: () => <div>Sign-in form</div>,
	UserButton: () => <div>User menu</div>,
	useAuth: () => ({
		isLoaded: true,
		isSignedIn: auth.signedIn,
		userId: auth.userId,
		getToken,
	}),
}));
vi.mock("../src/react-app/App", () => ({
	default: ({ demoMode, accountControl }: { demoMode?: boolean; accountControl?: ReactNode }) => (
		<div>
			{demoMode ? "Demo dashboard" : "Private dashboard"}
			{accountControl}
		</div>
	),
}));
vi.mock("../src/react-app/api/client", () => ({
	request: vi.fn(),
	setAccessTokenProvider: vi.fn(),
	setDemoMode: vi.fn(),
}));

beforeEach(() => {
	vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_placeholder");
	auth.signedIn = false;
	auth.userId = null;
	vi.mocked(request).mockReset().mockResolvedValue({ workspace_id: 2 });
	vi.mocked(setAccessTokenProvider).mockClear();
	vi.mocked(setDemoMode).mockClear();
	window.history.replaceState(null, "", "/");
});

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
});

it("shows sign-in and never loads private data while signed out", async () => {
	render(<AuthGate queryClient={new QueryClient()} />);
	expect(await screen.findByText("Sign-in form")).toBeTruthy();
	expect(screen.queryByText("Private dashboard")).toBeNull();
	expect(request).not.toHaveBeenCalled();
});

it("bootstraps the signed-in workspace before opening the dashboard", async () => {
	auth.signedIn = true;
	auth.userId = "user_123";
	render(<AuthGate queryClient={new QueryClient()} />);
	await waitFor(() => expect(request).toHaveBeenCalledWith("/me/bootstrap", { method: "POST" }));
	expect(await screen.findByText("Private dashboard")).toBeTruthy();
	expect(setAccessTokenProvider).toHaveBeenCalledWith(expect.any(Function));
});

it("opens the public demo without a session and can return to sign-in", async () => {
	vi.mocked(request).mockResolvedValueOnce({ latest_transaction_at: "2026-09-08T00:00:00Z" });
	render(<AuthGate queryClient={new QueryClient()} />);
	fireEvent.click(screen.getByRole("button", { name: "Explore demo without signing in" }));
	expect(await screen.findByText("Demo dashboard")).toBeTruthy();
	expect(request).toHaveBeenCalledWith("/metadata");
	expect(setDemoMode).toHaveBeenCalledWith(true);
	expect(window.location.search).toBe("?demo=1");
	fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
	expect(screen.getByText("Sign-in form")).toBeTruthy();
	expect(window.location.search).toBe("");
});
