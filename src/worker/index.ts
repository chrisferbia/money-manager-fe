import { Hono } from "hono";
import { forwardToBackend } from "./backendProxy";

type Bindings = {
	BACKEND_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.all("/api/*", async (c) => {
	return forwardToBackend(c.req.raw, c.env.BACKEND_URL);
});

export default app;
