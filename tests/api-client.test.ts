// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
	vi.resetModules();
	vi.stubEnv("VITE_API_URL", "");
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it.each(["network", "http", "invalid-config"])(
	"recovers from a %s config failure without reloading",
	async (failure) => {
		const fetchMock = vi.fn();
		if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("Offline"));
		else if (failure === "http")
			fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }));
		else fetchMock.mockResolvedValueOnce(Response.json({ apiBaseUrl: "invalid" }));
		fetchMock.mockResolvedValueOnce(Response.json({ apiBaseUrl: "https://api.example.test/" }));
		fetchMock.mockImplementation(async () => Response.json([]));
		vi.stubGlobal("fetch", fetchMock);
		const { request, setAccessTokenProvider } = await import("../src/react-app/api/client");
		setAccessTokenProvider(async () => "test-session-token");
		await expect(request("/accounts")).rejects.toThrow();
		await expect(request("/accounts")).resolves.toEqual([]);
		await expect(request("/categories")).resolves.toEqual([]);
		expect(fetchMock.mock.calls.filter(([url]) => url === "/runtime-config.json")).toHaveLength(
			2,
		);
		expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
			"https://api.example.test/accounts",
		);
	},
);

it("shares a successful config request between concurrent API calls", async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce(Response.json({ apiBaseUrl: "https://api.example.test" }))
		.mockImplementation(async () => Response.json([]));
	vi.stubGlobal("fetch", fetchMock);
	const { request, setAccessTokenProvider } = await import("../src/react-app/api/client");
	setAccessTokenProvider(async () => "test-session-token");
	await Promise.all([request("/accounts"), request("/categories")]);
	expect(fetchMock.mock.calls.filter(([url]) => url === "/runtime-config.json")).toHaveLength(1);
});

it("requires a session and sends its bearer token with API requests", async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce(Response.json({ apiBaseUrl: "https://api.example.test" }))
		.mockResolvedValueOnce(Response.json([]));
	vi.stubGlobal("fetch", fetchMock);
	const { request, setAccessTokenProvider } = await import("../src/react-app/api/client");
	setAccessTokenProvider(null);
	await expect(request("/accounts")).rejects.toThrow("Sign-in required");
	expect(fetchMock).not.toHaveBeenCalled();
	setAccessTokenProvider(async () => "signed-session");
	await request("/accounts");
	const [, options] = fetchMock.mock.calls[1] as [string, RequestInit];
	expect(new Headers(options.headers).get("Authorization")).toBe("Bearer signed-session");
});
