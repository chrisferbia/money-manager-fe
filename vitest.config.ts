import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Exercise local date conversion consistently, including on UTC CI machines.
process.env.TZ = "Asia/Jakarta";
export default defineConfig({
	plugins: [react()],
	test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"] },
});
