import { Hono } from "hono";

type Bindings = {
	BACKEND_URL?: string;
	CLERK_PUBLISHABLE_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/runtime-config.json", (c) => {
	c.header("Cache-Control", "no-store");
	const backendUrl = c.env.BACKEND_URL?.trim();

	if (!backendUrl) {
		return c.json({ detail: "BACKEND_URL is not configured" }, 500);
	}

	try {
		const url = new URL(backendUrl);
		if (
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			return c.json(
				{
					detail: "BACKEND_URL must be an HTTP(S) URL without credentials, query parameters, or a fragment",
				},
				400,
			);
		}

		return c.json({
			apiBaseUrl: url.toString().replace(/\/+$/, ""),
			clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY?.trim() || null,
		});
	} catch {
		return c.json({ detail: "BACKEND_URL must be an absolute HTTP(S) URL" }, 400);
	}
});

export default app;
