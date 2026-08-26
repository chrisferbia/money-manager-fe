export async function forwardToBackend(request: Request, backendUrl?: string): Promise<Response> {
	if (!backendUrl)
		return Response.json({ detail: "BACKEND_URL is not configured" }, { status: 500 });

	const incoming = new URL(request.url);
	const backend = new URL(backendUrl);
	const path = incoming.pathname.replace(/^\/api/, "") || "/";
	const target = new URL(`${path}${incoming.search}`, backend);

	return fetch(new Request(target, request));
}
