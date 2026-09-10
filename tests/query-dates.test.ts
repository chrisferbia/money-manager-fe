// @vitest-environment node
import { expect, it } from "vitest";
import { reportQuery, transactionQuery } from "../src/react-app/api/queries";

it.each([
	["2026-09-11", "2026-09-10T17:00:00Z", "2026-09-11T16:59:59Z"],
	["2027-01-01", "2026-12-31T17:00:00Z", "2027-01-01T16:59:59Z"],
	["2028-03-01", "2028-02-29T17:00:00Z", "2028-03-01T16:59:59Z"],
])("uses the complete Jakarta calendar day %s in both queries", (date, from, to) => {
	const filters = { account: "12", category: "3", type: "expense", from: date, to: date };
	for (const query of [transactionQuery(filters), reportQuery(filters)]) {
		const params = new URLSearchParams(query.queryKey[1]);
		expect(params.get("from")).toBe(from);
		expect(params.get("to")).toBe(to);
	}
});
it("omits unset date bounds and preserves other transaction filters", () => {
	const filters = { account: "12", category: "3", type: "expense", from: "", to: "" };
	expect(new URLSearchParams(transactionQuery(filters).queryKey[1]).toString()).toBe(
		"account_id=12&category_id=3&type=expense",
	);
	expect(reportQuery(filters).queryKey[1]).toBe("");
});
