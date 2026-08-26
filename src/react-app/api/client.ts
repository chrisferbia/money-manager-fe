const API_BASE = (
	import.meta.env.VITE_API_URL ?? "https://money-manager-be.azamines.workers.dev"
).replace(/\/$/, "");

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		headers: { "Content-Type": "application/json", ...options?.headers },
		...options,
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { detail?: string } | null;
		throw new Error(body?.detail || `Request failed (${response.status})`);
	}

	return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}
