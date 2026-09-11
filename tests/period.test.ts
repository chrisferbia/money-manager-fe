// @vitest-environment node
import { expect, it } from "vitest";
import { currentMonth, monthRange, shiftMonth } from "../src/react-app/utils/period";
import { transactionQuery } from "../src/react-app/api/queries";

it("uses local calendar months including leap years and year boundaries", () => {
	expect(currentMonth(new Date("2026-08-31T18:00:00Z"))).toBe("2026-09");
	expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
	expect(monthRange("2027-02").to).toBe("2027-02-28");
	expect(shiftMonth("2026-01", -1)).toBe("2025-12");
	expect(shiftMonth("2026-12", 1)).toBe("2027-01");
	const query = transactionQuery({
		account: "",
		type: "",
		category: "",
		...monthRange("2026-09"),
	});
	expect(Object.fromEntries(new URLSearchParams(query.queryKey[1]))).toEqual({
		from: "2026-08-31T17:00:00Z",
		to: "2026-09-30T16:59:59Z",
	});
});
