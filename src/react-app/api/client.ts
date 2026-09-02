type RuntimeConfig = {
	apiBaseUrl?: unknown;
	detail?: string;
};

let apiBasePromise: Promise<string> | undefined;

function normalizeApiBase(value: unknown): string {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error("The backend URL is not configured.");
	}

	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error("The backend URL must be an absolute HTTP(S) URL.");
	}

	if (
		(url.protocol !== "http:" && url.protocol !== "https:") ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error(
			"The backend URL must be an HTTP(S) URL without credentials, query parameters, or a fragment.",
		);
	}

	return url.toString().replace(/\/+$/, "");
}

async function loadApiBase(): Promise<string> {
	if (import.meta.env.DEV && import.meta.env.VITE_API_URL) {
		return normalizeApiBase(import.meta.env.VITE_API_URL);
	}

	const response = await fetch("/runtime-config.json", {
		headers: { Accept: "application/json" },
		cache: "no-store",
	});
	const body = (await response.json().catch(() => null)) as RuntimeConfig | null;

	if (!response.ok) {
		throw new Error(
			body?.detail || `Could not load runtime configuration (${response.status})`,
		);
	}

	return normalizeApiBase(body?.apiBaseUrl);
}

function getApiBase(): Promise<string> {
	apiBasePromise ??= loadApiBase();
	return apiBasePromise;
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const apiBase = await getApiBase();
	const headers = new Headers(options?.headers);
	if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

	const response = await fetch(`${apiBase}${path}`, {
		...options,
		headers,
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { detail?: string } | null;
		throw new Error(body?.detail || `Request failed (${response.status})`);
	}

	return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}
