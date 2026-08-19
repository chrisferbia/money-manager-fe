import { Hono } from "hono";

type Bindings = {
	BACKEND_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.all("/api/*", async (c) => {
	const backendUrl = c.env.BACKEND_URL;
	if (!backendUrl) return c.json({ detail: "BACKEND_URL is not configured" }, 500);

	const incoming = new URL(c.req.raw.url);
	const backend = new URL(backendUrl);
	const path = incoming.pathname.replace(/^\/api/, "") || "/";
	const target = new URL(`${path}${incoming.search}`, backend);

	return fetch(new Request(target, c.req.raw));
});

export default app;
